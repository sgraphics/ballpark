import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import {
  runOrchestrationStep,
  generateDemoResponse,
  isGeminiConfigured,
  type OrchestrationContext,
} from '@/lib/orchestrator';
import type { Listing, BuyAgent, SellAgent, Negotiation, NegMessage, NegotiationState } from '@/types/database';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { negotiation_id } = body;

    if (!negotiation_id) {
      return NextResponse.json({ error: 'negotiation_id is required' }, { status: 400 });
    }

    const negResult = await query<Negotiation>(
      'SELECT * FROM negotiations WHERE id = $1',
      [negotiation_id]
    );

    if (negResult.rows.length === 0) {
      return NextResponse.json({ error: 'Negotiation not found' }, { status: 404 });
    }

    const negotiation = negResult.rows[0];

    if (negotiation.state !== 'negotiating') {
      return NextResponse.json(
        { error: `Negotiation is not active (state: ${negotiation.state})` },
        { status: 400 }
      );
    }

    if (negotiation.ball === 'human') {
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
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }

    const listing = listingResult.rows[0];

    const buyAgentResult = await query<BuyAgent>(
      'SELECT * FROM buy_agents WHERE id = $1',
      [negotiation.buy_agent_id]
    );

    if (buyAgentResult.rows.length === 0) {
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

    const ctx: OrchestrationContext = {
      listing,
      buyAgent,
      sellAgent,
      negotiation,
      messages,
    };

    const result = isGeminiConfigured()
      ? await runOrchestrationStep(ctx)
      : generateDemoResponse(ctx);

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

    const eventType = result.role === 'buyer_agent' ? 'buyer_proposes' : 'seller_counters';
    await query(
      `INSERT INTO events (type, payload) VALUES ($1, $2)`,
      [
        result.isAgreed ? 'deal_agreed' : eventType,
        JSON.stringify({
          negotiation_id,
          listing_id: listing.id,
          listing_title: listing.title,
          price_proposal: result.parsed.price_proposal,
          status_message: result.parsed.status_message,
          agreed_price: result.agreedPrice,
        }),
      ]
    );

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
    const message = err instanceof Error ? err.message : 'Failed to run orchestration step';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
