import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { pushUpdate } from '@/lib/sse';
import type { Negotiation, NegMessage, ParsedMessage } from '@/types/database';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { negotiation_id, response, target, auto_continue } = body;

    if (!negotiation_id || !response) {
      return NextResponse.json(
        { error: 'negotiation_id and response are required' },
        { status: 400 }
      );
    }

    const negResult = await query<Negotiation>(
      'SELECT * FROM negotiations WHERE id = $1',
      [negotiation_id]
    );

    if (negResult.rows.length === 0) {
      return NextResponse.json({ error: 'Negotiation not found' }, { status: 404 });
    }

    const negotiation = negResult.rows[0];

    if (negotiation.ball !== 'human') {
      return NextResponse.json(
        { error: 'Not waiting for human input' },
        { status: 400 }
      );
    }

    // Determine the correct target from the last message's user_prompt
    const lastMsgResult = await query<NegMessage>(
      `SELECT * FROM messages WHERE negotiation_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [negotiation_id]
    );
    const lastMsg = lastMsgResult.rows[0];
    const promptTarget = lastMsg?.parsed?.user_prompt?.target;

    // Enforce: human response must match the prompt target
    // If the client sent a mismatched target, override with the correct one from the prompt
    const resolvedTarget = promptTarget || target || 'buyer';

    if (target && promptTarget && target !== promptTarget) {
      console.warn(`[human-response] Target mismatch: client sent "${target}" but prompt targets "${promptTarget}". Using "${promptTarget}".`);
    }

    const parsed: ParsedMessage = {
      answer: response,
      status_message: `Human (${resolvedTarget}) responded`,
      price_proposal: null,
      concessions: [],
      user_prompt: null,
    };

    await query<NegMessage>(
      `INSERT INTO messages (negotiation_id, role, raw, parsed)
       VALUES ($1, 'human', $2, $3)`,
      [negotiation_id, response, JSON.stringify(parsed)]
    );

    // Route the ball to the agent that asked the question
    // If a buyer_agent asked -> ball goes to buyer (so buyer_agent continues)
    // If a seller_agent asked -> ball goes to seller (so seller_agent continues)
    const lastAgentRole = lastMsg?.role;
    let newBall: 'buyer' | 'seller';
    if (lastAgentRole === 'seller_agent') {
      newBall = 'seller';
    } else if (lastAgentRole === 'buyer_agent') {
      newBall = 'buyer';
    } else {
      // Fallback: route based on resolved target
      newBall = resolvedTarget === 'seller' ? 'seller' : 'buyer';
    }

    await query(
      `UPDATE negotiations SET ball = $1, updated_at = NOW() WHERE id = $2`,
      [newBall, negotiation_id]
    );

    // Push SSE update
    pushUpdate(negotiation_id, {
      type: 'update',
      negotiation: {
        id: negotiation_id,
        state: negotiation.state,
        ball: newBall,
      },
      message: {
        id: `human-${Date.now()}`,
        negotiation_id,
        role: 'human',
        raw: response,
        parsed,
        created_at: new Date().toISOString(),
      },
    });

    if (auto_continue) {
      try {
        const baseUrl = req.nextUrl.origin;
        await fetch(`${baseUrl}/api/orchestrate/step`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ negotiation_id, auto_continue: true }),
        });
      } catch (stepErr) {
        console.error('Auto-continue after human response failed:', stepErr);
      }
    }

    return NextResponse.json({
      success: true,
      negotiation: {
        id: negotiation_id,
        ball: newBall,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to process human response';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
