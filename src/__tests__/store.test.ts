import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from '@/store/app-store';
import type { Listing, BuyAgent, Negotiation, NegMessage, AppEvent } from '@/types/database';

const makeListing = (overrides?: Partial<Listing>): Listing => ({
  id: 'l1',
  seller_user_id: 'u1',
  title: 'Test Item',
  description: 'A test item',
  category: 'clothing',
  structured: {},
  ask_price: 100,
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

const makeBuyAgent = (overrides?: Partial<BuyAgent>): BuyAgent => ({
  id: 'ba1',
  user_id: 'u1',
  name: 'Test Agent',
  category: 'clothing',
  filters: {},
  prompt: 'Find me good deals',
  max_price: 200,
  urgency: 'medium',
  status: 'active',
  internal_notes: '',
  created_at: new Date().toISOString(),
  ...overrides,
});

const makeNeg = (overrides?: Partial<Negotiation>): Negotiation => ({
  id: 'n1',
  buy_agent_id: 'ba1',
  listing_id: 'l1',
  state: 'negotiating',
  agreed_price: null,
  ball: 'buyer',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

const makeMsg = (overrides?: Partial<NegMessage>): NegMessage => ({
  id: 'm1',
  negotiation_id: 'n1',
  role: 'buyer_agent',
  raw: 'raw text',
  parsed: {
    answer: 'I propose $80',
    status_message: 'Opening offer at $80',
    price_proposal: 80,
    concessions: [],
    user_prompt: null,
  },
  created_at: new Date().toISOString(),
  ...overrides,
});

const makeEvent = (overrides?: Partial<AppEvent>): AppEvent => ({
  id: 'e1',
  user_id: null,
  type: 'listing_created',
  payload: { title: 'New Item' },
  created_at: new Date().toISOString(),
  ...overrides,
});

describe('AppStore', () => {
  beforeEach(() => {
    useAppStore.setState({
      currentUser: null,
      sidebarTab: 'feed',
      listings: [],
      sellAgents: [],
      buyAgents: [],
      negotiations: [],
      messages: {},
      events: [],
      matches: [],
      categoryFilter: '',
      searchQuery: '',
      isLoading: false,
    });
  });

  describe('listings', () => {
    it('sets listings', () => {
      const items = [makeListing(), makeListing({ id: 'l2' })];
      useAppStore.getState().setListings(items);
      expect(useAppStore.getState().listings).toHaveLength(2);
    });

    it('adds a listing to the front', () => {
      useAppStore.getState().setListings([makeListing({ id: 'l2' })]);
      useAppStore.getState().addListing(makeListing({ id: 'l1' }));
      expect(useAppStore.getState().listings[0].id).toBe('l1');
    });
  });

  describe('buy agents', () => {
    it('sets buy agents', () => {
      useAppStore.getState().setBuyAgents([makeBuyAgent()]);
      expect(useAppStore.getState().buyAgents).toHaveLength(1);
    });

    it('adds buy agent to front', () => {
      useAppStore.getState().setBuyAgents([makeBuyAgent({ id: 'ba2' })]);
      useAppStore.getState().addBuyAgent(makeBuyAgent({ id: 'ba1' }));
      expect(useAppStore.getState().buyAgents[0].id).toBe('ba1');
    });
  });

  describe('negotiations', () => {
    it('sets negotiations', () => {
      useAppStore.getState().setNegotiations([makeNeg()]);
      expect(useAppStore.getState().negotiations).toHaveLength(1);
    });

    it('updates negotiation by id', () => {
      useAppStore.getState().setNegotiations([makeNeg()]);
      useAppStore.getState().updateNegotiation('n1', { state: 'agreed', agreed_price: 90 });
      const n = useAppStore.getState().negotiations[0];
      expect(n.state).toBe('agreed');
      expect(n.agreed_price).toBe(90);
    });

    it('does not update non-matching id', () => {
      useAppStore.getState().setNegotiations([makeNeg()]);
      useAppStore.getState().updateNegotiation('nonexistent', { state: 'agreed' });
      expect(useAppStore.getState().negotiations[0].state).toBe('negotiating');
    });
  });

  describe('messages', () => {
    it('sets messages for a negotiation', () => {
      useAppStore.getState().setMessages('n1', [makeMsg()]);
      expect(useAppStore.getState().messages['n1']).toHaveLength(1);
    });

    it('adds a message', () => {
      useAppStore.getState().setMessages('n1', [makeMsg()]);
      useAppStore.getState().addMessage('n1', makeMsg({ id: 'm2', role: 'seller_agent' }));
      expect(useAppStore.getState().messages['n1']).toHaveLength(2);
    });

    it('creates array if none exists when adding', () => {
      useAppStore.getState().addMessage('n1', makeMsg());
      expect(useAppStore.getState().messages['n1']).toHaveLength(1);
    });
  });

  describe('events', () => {
    it('sets events', () => {
      useAppStore.getState().setEvents([makeEvent()]);
      expect(useAppStore.getState().events).toHaveLength(1);
    });

    it('adds event to front', () => {
      useAppStore.getState().setEvents([makeEvent({ id: 'e2' })]);
      useAppStore.getState().addEvent(makeEvent({ id: 'e1' }));
      expect(useAppStore.getState().events[0].id).toBe('e1');
    });
  });

  describe('filters', () => {
    it('sets category filter', () => {
      useAppStore.getState().setCategoryFilter('electronics');
      expect(useAppStore.getState().categoryFilter).toBe('electronics');
    });

    it('sets search query', () => {
      useAppStore.getState().setSearchQuery('watch');
      expect(useAppStore.getState().searchQuery).toBe('watch');
    });
  });

  describe('sidebar', () => {
    it('defaults to feed', () => {
      expect(useAppStore.getState().sidebarTab).toBe('feed');
    });

    it('changes tab', () => {
      useAppStore.getState().setSidebarTab('arena');
      expect(useAppStore.getState().sidebarTab).toBe('arena');
    });
  });
});
