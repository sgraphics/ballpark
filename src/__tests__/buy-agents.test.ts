import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from '@/store/app-store';
import type { BuyAgent, Match } from '@/types/database';
import { getCategoryById, getCategoryFields, CATEGORIES } from '@/types/categories';

const makeBuyAgent = (overrides?: Partial<BuyAgent>): BuyAgent => ({
  id: 'ba-1',
  user_id: 'user-1',
  name: 'Test Buy Agent',
  category: 'clothing',
  filters: { condition: 'Good', gender: 'Men' },
  prompt: 'Looking for vintage jackets',
  max_price: 500,
  urgency: 'medium',
  created_at: new Date().toISOString(),
  ...overrides,
});

const makeMatch = (overrides?: Partial<Match>): Match => ({
  id: 'match-1',
  buy_agent_id: 'ba-1',
  listing_id: 'listing-1',
  score: 75,
  reason: 'Category match. Within budget',
  status: 'potential',
  created_at: new Date().toISOString(),
  ...overrides,
});

describe('Buy Agent Store Operations', () => {
  beforeEach(() => {
    useAppStore.setState({
      buyAgents: [],
      matches: [],
    });
  });

  it('adds a buy agent to the store', () => {
    useAppStore.getState().addBuyAgent(makeBuyAgent());
    expect(useAppStore.getState().buyAgents).toHaveLength(1);
    expect(useAppStore.getState().buyAgents[0].name).toBe('Test Buy Agent');
  });

  it('prepends new buy agents', () => {
    const older = makeBuyAgent({ id: 'ba-old', name: 'Older Agent' });
    useAppStore.getState().addBuyAgent(older);
    useAppStore.getState().addBuyAgent(makeBuyAgent());
    expect(useAppStore.getState().buyAgents[0].name).toBe('Test Buy Agent');
    expect(useAppStore.getState().buyAgents[1].name).toBe('Older Agent');
  });

  it('sets buy agents array', () => {
    const agents = [makeBuyAgent(), makeBuyAgent({ id: 'ba-2', name: 'Second' })];
    useAppStore.getState().setBuyAgents(agents);
    expect(useAppStore.getState().buyAgents).toHaveLength(2);
  });

  it('adds a match to the store', () => {
    useAppStore.getState().addMatch(makeMatch());
    expect(useAppStore.getState().matches).toHaveLength(1);
    expect(useAppStore.getState().matches[0].score).toBe(75);
  });

  it('prepends new matches', () => {
    const older = makeMatch({ id: 'match-old', score: 50 });
    useAppStore.getState().addMatch(older);
    useAppStore.getState().addMatch(makeMatch());
    expect(useAppStore.getState().matches[0].id).toBe('match-1');
  });

  it('updates match by id', () => {
    useAppStore.getState().setMatches([makeMatch()]);
    useAppStore.getState().updateMatch('match-1', { status: 'dismissed' });
    expect(useAppStore.getState().matches[0].status).toBe('dismissed');
  });

  it('does not update non-matching match id', () => {
    useAppStore.getState().setMatches([makeMatch()]);
    useAppStore.getState().updateMatch('nonexistent', { status: 'dismissed' });
    expect(useAppStore.getState().matches[0].status).toBe('potential');
  });

  it('transitions match to negotiating', () => {
    useAppStore.getState().setMatches([makeMatch()]);
    useAppStore.getState().updateMatch('match-1', { status: 'negotiating' });
    expect(useAppStore.getState().matches[0].status).toBe('negotiating');
  });
});

describe('Buy Agent Data Validation', () => {
  it('buy agent has required fields', () => {
    const agent = makeBuyAgent();
    expect(agent.id).toBeTruthy();
    expect(agent.name).toBeTruthy();
    expect(agent.category).toBeTruthy();
    expect(typeof agent.max_price).toBe('number');
    expect(['low', 'medium', 'high']).toContain(agent.urgency);
  });

  it('buy agent category matches a valid category', () => {
    const agent = makeBuyAgent();
    const cat = getCategoryById(agent.category);
    expect(cat).toBeDefined();
    expect(cat!.name).toBe('Clothing');
  });

  it('buy agent filters correspond to category fields', () => {
    const agent = makeBuyAgent({ category: 'clothing', filters: { condition: 'Good', gender: 'Men' } });
    const fields = getCategoryFields(agent.category);
    const fieldKeys = fields.map((f) => f.key);
    const filterKeys = Object.keys(agent.filters);

    filterKeys.forEach((key) => {
      expect(fieldKeys).toContain(key);
    });
  });

  it('buy agent urgency is valid', () => {
    const validUrgencies = ['low', 'medium', 'high'];
    validUrgencies.forEach((u) => {
      const agent = makeBuyAgent({ urgency: u as BuyAgent['urgency'] });
      expect(validUrgencies).toContain(agent.urgency);
    });
  });

  it('buy agent max_price is non-negative', () => {
    const agent = makeBuyAgent({ max_price: 0 });
    expect(agent.max_price).toBeGreaterThanOrEqual(0);
  });

  it('buy agent filters can be empty', () => {
    const agent = makeBuyAgent({ filters: {} });
    expect(Object.keys(agent.filters)).toHaveLength(0);
  });

  it('all categories can be used for buy agents', () => {
    CATEGORIES.forEach((cat) => {
      const agent = makeBuyAgent({ category: cat.id });
      expect(agent.category).toBe(cat.id);
      const fields = getCategoryFields(cat.id);
      expect(fields.length).toBeGreaterThanOrEqual(1);
    });
  });
});

describe('Match Data Validation', () => {
  it('match has required fields', () => {
    const match = makeMatch();
    expect(match.id).toBeTruthy();
    expect(match.buy_agent_id).toBeTruthy();
    expect(match.listing_id).toBeTruthy();
    expect(typeof match.score).toBe('number');
    expect(match.reason).toBeTruthy();
    expect(match.status).toBe('potential');
  });

  it('match score is between 0 and 100', () => {
    const match = makeMatch({ score: 85 });
    expect(match.score).toBeGreaterThanOrEqual(0);
    expect(match.score).toBeLessThanOrEqual(100);
  });

  it('match status is valid', () => {
    const validStatuses = ['potential', 'negotiating', 'dismissed'];
    validStatuses.forEach((s) => {
      const match = makeMatch({ status: s as Match['status'] });
      expect(validStatuses).toContain(match.status);
    });
  });

  it('match reason is a non-empty string', () => {
    const match = makeMatch();
    expect(typeof match.reason).toBe('string');
    expect(match.reason.length).toBeGreaterThan(0);
  });
});
