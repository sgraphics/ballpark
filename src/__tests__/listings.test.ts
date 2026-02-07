import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from '@/store/app-store';
import type { Listing, SellAgent } from '@/types/database';
import { getCategoryById, getCategoryFields, CATEGORIES } from '@/types/categories';

const mockListing: Listing = {
  id: 'listing-1',
  seller_user_id: 'user-1',
  title: 'Test Jacket',
  description: 'A leather jacket in good condition',
  category: 'clothing',
  structured: { size: 'M', gender: 'Men', brand: 'TestBrand', condition: 'Good' },
  ask_price: 200,
  condition_notes: [
    { issue: 'Minor scuff on sleeve', confidence: 'high' },
    { issue: 'Slight discoloration on collar', confidence: 'medium' },
  ],
  haggling_ammo: ['Good leather quality', 'Minor cosmetic issues only'],
  image_urls: ['https://example.com/img1.jpg'],
  hero_image_url: null,
  status: 'active',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const mockSellAgent: SellAgent = {
  id: 'agent-1',
  user_id: 'user-1',
  listing_id: 'listing-1',
  name: 'Test Agent',
  min_price: 150,
  urgency: 'medium',
  preferences: {},
  created_at: new Date().toISOString(),
};

describe('Listing Store Operations', () => {
  beforeEach(() => {
    useAppStore.setState({
      listings: [],
      sellAgents: [],
      categoryFilter: '',
      searchQuery: '',
    });
  });

  it('adds a listing to the store', () => {
    useAppStore.getState().addListing(mockListing);
    expect(useAppStore.getState().listings).toHaveLength(1);
    expect(useAppStore.getState().listings[0].title).toBe('Test Jacket');
  });

  it('prepends new listings', () => {
    const older = { ...mockListing, id: 'older', title: 'Older Listing' };
    useAppStore.getState().addListing(older);
    useAppStore.getState().addListing(mockListing);
    expect(useAppStore.getState().listings[0].title).toBe('Test Jacket');
    expect(useAppStore.getState().listings[1].title).toBe('Older Listing');
  });

  it('sets listings array', () => {
    const listings = [mockListing, { ...mockListing, id: 'listing-2', title: 'Second' }];
    useAppStore.getState().setListings(listings);
    expect(useAppStore.getState().listings).toHaveLength(2);
  });

  it('adds a sell agent to the store', () => {
    useAppStore.getState().addSellAgent(mockSellAgent);
    expect(useAppStore.getState().sellAgents).toHaveLength(1);
    expect(useAppStore.getState().sellAgents[0].name).toBe('Test Agent');
  });

  it('prepends new sell agents', () => {
    const older = { ...mockSellAgent, id: 'older-agent', name: 'Older Agent' };
    useAppStore.getState().addSellAgent(older);
    useAppStore.getState().addSellAgent(mockSellAgent);
    expect(useAppStore.getState().sellAgents[0].name).toBe('Test Agent');
  });
});

describe('Listing Filtering Logic', () => {
  const listings = [
    { ...mockListing, id: '1', category: 'clothing', title: 'Leather Jacket' },
    { ...mockListing, id: '2', category: 'electronics', title: 'MacBook Pro' },
    { ...mockListing, id: '3', category: 'furniture', title: 'Wooden Desk' },
    { ...mockListing, id: '4', category: 'clothing', title: 'Silk Dress' },
  ];

  it('filters by category', () => {
    const filtered = listings.filter((l) => l.category === 'clothing');
    expect(filtered).toHaveLength(2);
    expect(filtered.map((l) => l.title)).toContain('Leather Jacket');
    expect(filtered.map((l) => l.title)).toContain('Silk Dress');
  });

  it('filters by search query', () => {
    const q = 'macbook';
    const filtered = listings.filter((l) => l.title.toLowerCase().includes(q));
    expect(filtered).toHaveLength(1);
    expect(filtered[0].title).toBe('MacBook Pro');
  });

  it('combines category and search filters', () => {
    const category = 'clothing';
    const q = 'leather';
    const filtered = listings
      .filter((l) => l.category === category)
      .filter((l) => l.title.toLowerCase().includes(q));
    expect(filtered).toHaveLength(1);
    expect(filtered[0].title).toBe('Leather Jacket');
  });

  it('returns empty when no matches', () => {
    const filtered = listings.filter((l) => l.title.toLowerCase().includes('nonexistent'));
    expect(filtered).toHaveLength(0);
  });
});

describe('Category Fields for Listings', () => {
  it('returns clothing fields', () => {
    const fields = getCategoryFields('clothing');
    expect(fields.length).toBeGreaterThanOrEqual(3);
    const keys = fields.map((f) => f.key);
    expect(keys).toContain('size');
    expect(keys).toContain('gender');
    expect(keys).toContain('condition');
  });

  it('returns electronics fields', () => {
    const fields = getCategoryFields('electronics');
    const keys = fields.map((f) => f.key);
    expect(keys).toContain('brand');
    expect(keys).toContain('condition');
  });

  it('returns empty for unknown category', () => {
    const fields = getCategoryFields('nonexistent');
    expect(fields).toHaveLength(0);
  });

  it('validates structured data against fields', () => {
    const fields = getCategoryFields('clothing');
    const requiredFields = fields.filter((f) => f.required);
    const structured = mockListing.structured;
    requiredFields.forEach((field) => {
      expect(structured[field.key]).toBeDefined();
    });
  });

  it('all categories have condition field', () => {
    CATEGORIES.forEach((cat) => {
      const condField = cat.fields.find((f) => f.key === 'condition');
      expect(condField).toBeDefined();
      expect(condField?.type).toBe('select');
    });
  });
});

describe('Listing Condition Notes', () => {
  it('supports multiple confidence levels', () => {
    const notes = mockListing.condition_notes;
    const confidences = notes.map((n) => n.confidence);
    expect(confidences).toContain('high');
    expect(confidences).toContain('medium');
  });

  it('condition notes are non-empty strings', () => {
    mockListing.condition_notes.forEach((note) => {
      expect(note.issue.length).toBeGreaterThan(0);
      expect(['high', 'medium', 'low']).toContain(note.confidence);
    });
  });
});

describe('Listing Haggling Ammo', () => {
  it('contains string items', () => {
    mockListing.haggling_ammo.forEach((item) => {
      expect(typeof item).toBe('string');
      expect(item.length).toBeGreaterThan(0);
    });
  });

  it('has at least one item', () => {
    expect(mockListing.haggling_ammo.length).toBeGreaterThanOrEqual(1);
  });
});

describe('Listing Status Transitions', () => {
  const validStatuses = ['draft', 'active', 'negotiating', 'sold', 'cancelled'];

  it('mockListing has valid status', () => {
    expect(validStatuses).toContain(mockListing.status);
  });

  it('all defined statuses are strings', () => {
    validStatuses.forEach((s) => {
      expect(typeof s).toBe('string');
    });
  });
});
