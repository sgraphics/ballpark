import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { findMatches, candidateToMatch } from '@/lib/finder';
import type { BuyAgent, Listing, Match } from '@/types/database';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { buy_agent_id } = body;

    if (!buy_agent_id) {
      return NextResponse.json({ error: 'buy_agent_id is required' }, { status: 400 });
    }

    const agentResult = await query<BuyAgent>(
      'SELECT * FROM buy_agents WHERE id = $1',
      [buy_agent_id]
    );

    if (agentResult.rows.length === 0) {
      return NextResponse.json({ error: 'Buy agent not found' }, { status: 404 });
    }

    const agent = agentResult.rows[0];

    const listingsResult = await query<Listing>(
      'SELECT * FROM listings WHERE category = $1 AND status = $2 ORDER BY created_at DESC LIMIT 100',
      [agent.category, 'active']
    );

    const existingMatches = await query<Match>(
      'SELECT listing_id FROM matches WHERE buy_agent_id = $1',
      [buy_agent_id]
    );
    const existingListingIds = new Set(existingMatches.rows.map((m) => m.listing_id));

    const availableListings = listingsResult.rows.filter(
      (l) => !existingListingIds.has(l.id)
    );

    const candidates = findMatches(agent, availableListings);

    const newMatches: Match[] = [];

    for (const candidate of candidates) {
      const matchData = candidateToMatch(candidate, buy_agent_id);

      const insertResult = await query<Match>(
        `INSERT INTO matches (buy_agent_id, listing_id, score, reason, status)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [
          matchData.buy_agent_id,
          matchData.listing_id,
          matchData.score,
          matchData.reason,
          matchData.status,
        ]
      );

      newMatches.push(insertResult.rows[0]);
    }

    return NextResponse.json({
      matches: newMatches,
      total_scanned: availableListings.length,
      total_matched: newMatches.length,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to run finder';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
