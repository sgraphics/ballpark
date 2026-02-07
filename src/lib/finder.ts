import type { BuyAgent, Listing, Match } from '@/types/database';
import { getCategoryFields } from '@/types/categories';

export interface MatchCandidate {
  listing: Listing;
  score: number;
  reason: string;
}

export function scoreListing(agent: BuyAgent, listing: Listing): MatchCandidate | null {
  if (listing.category !== agent.category) return null;
  if (listing.status !== 'active') return null;

  let score = 50;
  const reasons: string[] = [];

  if (agent.max_price > 0 && listing.ask_price > agent.max_price) {
    const overBy = ((listing.ask_price - agent.max_price) / agent.max_price) * 100;
    if (overBy > 30) return null;
    score -= Math.round(overBy);
    reasons.push(`${Math.round(overBy)}% over budget`);
  } else if (agent.max_price > 0) {
    const underBy = ((agent.max_price - listing.ask_price) / agent.max_price) * 100;
    score += Math.min(Math.round(underBy * 0.5), 20);
    reasons.push('Within budget');
  }

  const fields = getCategoryFields(agent.category);
  const filters = agent.filters as Record<string, string>;
  const structured = listing.structured as Record<string, string>;

  let filterMatches = 0;
  let filterTotal = 0;

  for (const field of fields) {
    const filterVal = filters[field.key];
    if (!filterVal) continue;

    filterTotal++;
    const listingVal = structured[field.key];

    if (listingVal && listingVal.toLowerCase() === filterVal.toLowerCase()) {
      filterMatches++;
      score += 10;
    } else if (listingVal) {
      score -= 5;
    }
  }

  if (filterTotal > 0 && filterMatches > 0) {
    reasons.push(`${filterMatches}/${filterTotal} filters matched`);
  }

  if (listing.condition_notes.length > 0) {
    const highConf = listing.condition_notes.filter((n) => n.confidence === 'high').length;
    if (highConf > 0) {
      reasons.push(`${highConf} verified condition detail${highConf > 1 ? 's' : ''}`);
    }
  }

  if (listing.haggling_ammo.length > 0) {
    score += Math.min(listing.haggling_ammo.length * 2, 10);
  }

  score = Math.max(0, Math.min(100, score));

  if (score < 20) return null;

  return {
    listing,
    score,
    reason: reasons.length > 0 ? reasons.join('. ') : 'Category match',
  };
}

export function findMatches(agent: BuyAgent, listings: Listing[]): MatchCandidate[] {
  const candidates: MatchCandidate[] = [];

  for (const listing of listings) {
    const candidate = scoreListing(agent, listing);
    if (candidate) {
      candidates.push(candidate);
    }
  }

  candidates.sort((a, b) => b.score - a.score);

  return candidates.slice(0, 20);
}

export function candidateToMatch(
  candidate: MatchCandidate,
  buyAgentId: string
): Omit<Match, 'id' | 'created_at'> {
  return {
    buy_agent_id: buyAgentId,
    listing_id: candidate.listing.id,
    score: candidate.score,
    reason: candidate.reason,
    status: 'potential',
  };
}
