import { describe, it, expect } from 'vitest';
import { scoreListing, findMatches, candidateToMatch } from '@/lib/finder';
import type { BuyAgent, Listing } from '@/types/database';

const makeAgent = (overrides?: Partial<BuyAgent>): BuyAgent => ({
  id: 'ba-1',
  user_id: 'user-1',
  name: 'Test Agent',
  category: 'clothing',
  filters: {},
  prompt: '',
  max_price: 500,
  urgency: 'medium',
  status: 'active',
  created_at: new Date().toISOString(),
  ...overrides,
});

const makeListing = (overrides?: Partial<Listing>): Listing => ({
  id: 'l-1',
  seller_user_id: 'user-2',
  title: 'Test Item',
  description: 'A test item',
  category: 'clothing',
  structured: {},
  ask_price: 300,
  condition_notes: [],
  haggling_ammo: [],
  image_urls: [],
  hero_image_url: null,
  hero_thumbnail_url: null,
  status: 'active',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

describe('scoreListing', () => {
  it('returns null for mismatched category', () => {
    const agent = makeAgent({ category: 'clothing' });
    const listing = makeListing({ category: 'electronics' });
    expect(scoreListing(agent, listing)).toBeNull();
  });

  it('returns null for non-active listings', () => {
    const agent = makeAgent();
    const listing = makeListing({ status: 'sold' });
    expect(scoreListing(agent, listing)).toBeNull();
  });

  it('returns null for listings way over budget', () => {
    const agent = makeAgent({ max_price: 100 });
    const listing = makeListing({ ask_price: 200 });
    expect(scoreListing(agent, listing)).toBeNull();
  });

  it('matches same-category active listing within budget', () => {
    const agent = makeAgent({ category: 'clothing', max_price: 500 });
    const listing = makeListing({ category: 'clothing', ask_price: 300 });
    const result = scoreListing(agent, listing);
    expect(result).not.toBeNull();
    expect(result!.score).toBeGreaterThan(0);
  });

  it('scores higher for listings under budget', () => {
    const agent = makeAgent({ max_price: 500 });
    const cheap = makeListing({ id: 'l-cheap', ask_price: 100 });
    const expensive = makeListing({ id: 'l-exp', ask_price: 480 });

    const cheapResult = scoreListing(agent, cheap)!;
    const expResult = scoreListing(agent, expensive)!;

    expect(cheapResult.score).toBeGreaterThan(expResult.score);
  });

  it('boosts score for matching filters', () => {
    const agent = makeAgent({
      category: 'clothing',
      filters: { condition: 'Good', gender: 'Men' },
    });

    const matching = makeListing({
      id: 'l-match',
      structured: { condition: 'Good', gender: 'Men' },
    });

    const nonMatching = makeListing({
      id: 'l-no-match',
      structured: { condition: 'Poor', gender: 'Women' },
    });

    const matchResult = scoreListing(agent, matching)!;
    const noMatchResult = scoreListing(agent, nonMatching)!;

    expect(matchResult.score).toBeGreaterThan(noMatchResult.score);
  });

  it('includes filter match info in reason', () => {
    const agent = makeAgent({
      category: 'clothing',
      filters: { condition: 'Good' },
    });
    const listing = makeListing({ structured: { condition: 'Good' } });
    const result = scoreListing(agent, listing)!;
    expect(result.reason).toContain('filter');
  });

  it('boosts score for listings with haggling ammo', () => {
    const agent = makeAgent();
    const withAmmo = makeListing({ id: 'l-ammo', haggling_ammo: ['Fact 1', 'Fact 2', 'Fact 3'] });
    const withoutAmmo = makeListing({ id: 'l-no-ammo', haggling_ammo: [] });

    const ammoResult = scoreListing(agent, withAmmo)!;
    const noAmmoResult = scoreListing(agent, withoutAmmo)!;

    expect(ammoResult.score).toBeGreaterThan(noAmmoResult.score);
  });

  it('notes high-confidence condition details in reason', () => {
    const agent = makeAgent();
    const listing = makeListing({
      condition_notes: [
        { issue: 'Minor scuff', confidence: 'high' },
        { issue: 'Possible wear', confidence: 'low' },
      ],
    });
    const result = scoreListing(agent, listing)!;
    expect(result.reason).toContain('verified');
  });

  it('score is clamped between 0 and 100', () => {
    const agent = makeAgent({ max_price: 10000 });
    const listing = makeListing({
      ask_price: 10,
      haggling_ammo: Array(20).fill('fact'),
      structured: {},
    });
    const result = scoreListing(agent, listing)!;
    expect(result.score).toBeLessThanOrEqual(100);
    expect(result.score).toBeGreaterThanOrEqual(0);
  });

  it('handles zero max_price (no budget constraint)', () => {
    const agent = makeAgent({ max_price: 0 });
    const listing = makeListing({ ask_price: 99999 });
    const result = scoreListing(agent, listing);
    expect(result).not.toBeNull();
  });
});

describe('findMatches', () => {
  it('returns empty array for no listings', () => {
    const agent = makeAgent();
    const result = findMatches(agent, []);
    expect(result).toHaveLength(0);
  });

  it('returns empty array when no listings match category', () => {
    const agent = makeAgent({ category: 'vehicles' });
    const listings = [
      makeListing({ id: 'l-1', category: 'clothing' }),
      makeListing({ id: 'l-2', category: 'electronics' }),
    ];
    expect(findMatches(agent, listings)).toHaveLength(0);
  });

  it('finds matching listings by category', () => {
    const agent = makeAgent({ category: 'clothing' });
    const listings = [
      makeListing({ id: 'l-1', category: 'clothing' }),
      makeListing({ id: 'l-2', category: 'electronics' }),
      makeListing({ id: 'l-3', category: 'clothing' }),
    ];
    const result = findMatches(agent, listings);
    expect(result.length).toBeGreaterThanOrEqual(2);
  });

  it('sorts results by score descending', () => {
    const agent = makeAgent({ category: 'clothing', max_price: 1000 });
    const listings = [
      makeListing({ id: 'l-1', ask_price: 900 }),
      makeListing({ id: 'l-2', ask_price: 100, haggling_ammo: ['Great deal', 'Rare find'] }),
    ];
    const result = findMatches(agent, listings);
    expect(result.length).toBe(2);
    expect(result[0].score).toBeGreaterThanOrEqual(result[1].score);
  });

  it('limits results to 20 matches', () => {
    const agent = makeAgent({ category: 'clothing', max_price: 10000 });
    const listings = Array.from({ length: 30 }, (_, i) =>
      makeListing({ id: `l-${i}`, ask_price: 100 + i })
    );
    const result = findMatches(agent, listings);
    expect(result.length).toBeLessThanOrEqual(20);
  });

  it('excludes non-active listings', () => {
    const agent = makeAgent();
    const listings = [
      makeListing({ id: 'l-active', status: 'active' }),
      makeListing({ id: 'l-sold', status: 'sold' }),
      makeListing({ id: 'l-draft', status: 'draft' }),
    ];
    const result = findMatches(agent, listings);
    expect(result).toHaveLength(1);
    expect(result[0].listing.id).toBe('l-active');
  });
});

describe('candidateToMatch', () => {
  it('converts candidate to match shape', () => {
    const candidate = {
      listing: makeListing(),
      score: 82,
      reason: 'Good match',
    };
    const match = candidateToMatch(candidate, 'ba-1');

    expect(match.buy_agent_id).toBe('ba-1');
    expect(match.listing_id).toBe('l-1');
    expect(match.score).toBe(82);
    expect(match.reason).toBe('Good match');
    expect(match.status).toBe('potential');
  });

  it('always sets status to potential', () => {
    const candidate = {
      listing: makeListing(),
      score: 50,
      reason: 'Partial match',
    };
    const match = candidateToMatch(candidate, 'ba-2');
    expect(match.status).toBe('potential');
  });
});
