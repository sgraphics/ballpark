import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import {
  runOrchestrationStep,
  generateDemoResponse,
  isGeminiConfigured,
  type OrchestrationContext,
} from '@/lib/orchestrator';
import { pushUpdate } from '@/lib/sse';
import type { Listing, BuyAgent, SellAgent, Negotiation, NegMessage, NegotiationState } from '@/types/database';

const processingNegotiations = new Set<string>();

export async function POST(req: NextRequest) {
  let negotiationId: string | null = null;

  try {
    const body = await req.json();
    const { negotiation_id, auto_continue } = body;
    negotiationId = negotiation_id;

    if (!negotiation_id) {
      return NextResponse.json({ error: 'negotiation_id is required' }, { status: 400 });
    }

    if (processingNegotiations.has(negotiation_id)) {
      return NextResponse.json({ error: 'Negotiation is already being processed' }, { status: 409 });
    }

    processingNegotiations.add(negotiation_id);
    console.log(`[orchestrate/step] Starting for negotiation ${negotiation_id}`);

    const negResult = await query<Negotiation>(
      'SELECT * FROM negotiations WHERE id = $1',
      [negotiation_id]
    );

    if (negResult.rows.length === 0) {
      processingNegotiations.delete(negotiation_id);
      return NextResponse.json({ error: 'Negotiation not found' }, { status: 404 });
    }

    const negotiation = negResult.rows[0];

    if (negotiation.state !== 'negotiating') {
      processingNegotiations.delete(negotiation_id);
      return NextResponse.json(
        { error: `Negotiation is not active (state: ${negotiation.state})` },
        { status: 400 }
      );
    }

    if (negotiation.ball === 'human') {
      processingNegotiations.delete(negotiation_id);
      return NextResponse.json(
        { error: 'Waiting for human input' },
        { status: 400 }
      );
    }

    const listingResult = await query<Listing>(
      'SELECT * FROM listings WHERE id = $1',
      [negotiation.listing_id]
    );

    if (listingResult.rows.length === 0) {
      processingNegotiations.delete(negotiation_id);
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }

    const listing = listingResult.rows[0];

    const buyAgentResult = await query<BuyAgent>(
      'SELECT * FROM buy_agents WHERE id = $1',
      [negotiation.buy_agent_id]
    );

    if (buyAgentResult.rows.length === 0) {
      processingNegotiations.delete(negotiation_id);
      return NextResponse.json({ error: 'Buy agent not found' }, { status: 404 });
    }

    const buyAgent = buyAgentResult.rows[0];

    const sellAgentResult = await query<SellAgent>(
      'SELECT * FROM sell_agents WHERE listing_id = $1',
      [listing.id]
    );

    const sellAgent = sellAgentResult.rows.length > 0 ? sellAgentResult.rows[0] : null;

    const messagesResult = await query<NegMessage>(
      'SELECT * FROM messages WHERE negotiation_id = $1 ORDER BY created_at ASC',
      [negotiation_id]
    );

    const messages = messagesResult.rows;

    console.log(`[orchestrate/step] Loaded context: listing=${listing.id}, buyAgent=${buyAgent.id}, sellAgent=${sellAgent?.id || 'none'}, messages=${messages.length}, ball=${negotiation.ball}`);

    const ctx: OrchestrationContext = {
      listing,
      buyAgent,
      sellAgent,
      negotiation,
      messages,
    };

    const agentRole = negotiation.ball === 'buyer' ? 'Buyer' : 'Seller';
    await query(
      `INSERT INTO events (type, payload) VALUES ($1, $2)`,
      [
        'agent_processing',
        JSON.stringify({
          negotiation_id,
          listing_id: listing.id,
          listing_title: listing.title,
          status_message: `${agentRole} agent is thinking...`,
          agent_role: agentRole.toLowerCase(),
          ball: negotiation.ball,
        }),
      ]
    );

    const geminiReady = isGeminiConfigured();
    console.log(`[orchestrate/step] Gemini configured: ${geminiReady}, calling ${geminiReady ? 'runOrchestrationStep' : 'generateDemoResponse'}...`);

    const result = geminiReady
      ? await runOrchestrationStep(ctx)
      : generateDemoResponse(ctx);

    console.log(`[orchestrate/step] Result: role=${result.role}, agreed=${result.isAgreed}, newBall=${result.newBall}, price=${result.parsed.price_proposal}`);

    await query<NegMessage>(
      `INSERT INTO messages (negotiation_id, role, raw, parsed)
       VALUES ($1, $2, $3, $4)`,
      [negotiation_id, result.role, result.raw, JSON.stringify(result.parsed)]
    );

    let newState: NegotiationState = negotiation.state;
    if (result.isAgreed && result.agreedPrice !== null) {
      newState = 'agreed';
    }

    await query(
      `UPDATE negotiations SET state = $1, ball = $2, agreed_price = $3, updated_at = NOW()
       WHERE id = $4`,
      [newState, result.newBall, result.agreedPrice, negotiation_id]
    );

    let eventType = result.role === 'buyer_agent' ? 'buyer_proposes' : 'seller_counters';
    if (result.isAgreed) {
      eventType = 'deal_agreed';
    } else if (result.newBall === 'human') {
      eventType = 'human_input_required';
    }

    await query(
      `INSERT INTO events (type, payload) VALUES ($1, $2)`,
      [
        eventType,
        JSON.stringify({
          negotiation_id,
          listing_id: listing.id,
          listing_title: listing.title,
          price_proposal: result.parsed.price_proposal,
          status_message: result.parsed.status_message,
          agreed_price: result.agreedPrice,
          user_prompt: result.parsed.user_prompt,
          ball: result.newBall,
        }),
      ]
    );

    // Push real-time update to all connected SSE clients
    pushUpdate(negotiation_id, {
      type: 'update',
      negotiation: {
        id: negotiation_id,
        state: newState,
        ball: result.newBall,
        agreed_price: result.agreedPrice,
      },
      message: {
        id: `msg-${Date.now()}`,
        negotiation_id,
        role: result.role,
        raw: result.raw,
        parsed: result.parsed,
        created_at: new Date().toISOString(),
      },
    });

    processingNegotiations.delete(negotiation_id);

    if (auto_continue && !result.isAgreed && result.newBall !== 'human') {
      setTimeout(async () => {
        try {
          const baseUrl = req.nextUrl.origin;
          await fetch(`${baseUrl}/api/orchestrate/step`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ negotiation_id, auto_continue: true }),
          });
        } catch (continueErr) {
          console.error('Auto-continue failed:', continueErr);
        }
      }, 1500);
    }

    return NextResponse.json({
      message: {
        role: result.role,
        raw: result.raw,
        parsed: result.parsed,
      },
      negotiation: {
        id: negotiation_id,
        state: newState,
        ball: result.newBall,
        agreed_price: result.agreedPrice,
      },
      isAgreed: result.isAgreed,
    });
  } catch (err) {
    if (negotiationId) {
      processingNegotiations.delete(negotiationId);
    }
    const message = err instanceof Error ? err.message : 'Failed to run orchestration step';
    const stack = err instanceof Error ? err.stack : undefined;
    console.error('[orchestrate/step] ERROR:', message);
    if (stack) console.error('[orchestrate/step] Stack:', stack);
    console.error('[orchestrate/step] Full error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
