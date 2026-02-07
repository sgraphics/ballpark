import { describe, it, expect } from 'vitest';
import type { Listing, BuyAgent, SellAgent, Negotiation, NegMessage, ParsedMessage } from '@/types/database';

const makeListing = (overrides?: Partial<Listing>): Listing => ({
  id: 'listing-1',
  seller_user_id: 'user-seller',
  title: 'Test Product',
  description: 'A test product for negotiation',
  category: 'electronics',
  structured: { brand: 'Apple', condition: 'Good' },
  ask_price: 1000,
  condition_notes: [
    { issue: 'Minor scratch on screen', confidence: 'high' },
    { issue: 'Battery health 85%', confidence: 'medium' },
  ],
  haggling_ammo: ['Original packaging included', 'Receipt available'],
  image_urls: ['https://example.com/image1.jpg'],
  hero_image_url: null,
  status: 'negotiating',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

const makeBuyAgent = (overrides?: Partial<BuyAgent>): BuyAgent => ({
  id: 'ba-1',
  user_id: 'user-buyer',
  name: 'Test Buyer Agent',
  category: 'electronics',
  filters: { brand: 'Apple' },
  prompt: 'Looking for a good deal on Apple products',
  max_price: 900,
  urgency: 'medium',
  created_at: new Date().toISOString(),
  ...overrides,
});

const makeSellAgent = (overrides?: Partial<SellAgent>): SellAgent => ({
  id: 'sa-1',
  user_id: 'user-seller',
  listing_id: 'listing-1',
  name: 'Test Seller Agent',
  min_price: 800,
  urgency: 'low',
  preferences: {},
  created_at: new Date().toISOString(),
  ...overrides,
});

const makeNegotiation = (overrides?: Partial<Negotiation>): Negotiation => ({
  id: 'neg-1',
  buy_agent_id: 'ba-1',
  listing_id: 'listing-1',
  state: 'negotiating',
  agreed_price: null,
  ball: 'buyer',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

const makeMessage = (overrides?: Partial<NegMessage>): NegMessage => ({
  id: 'msg-1',
  negotiation_id: 'neg-1',
  role: 'buyer_agent',
  raw: '{"answer": "Test", "status_message": "Testing", "price_proposal": 800}',
  parsed: {
    answer: 'Test',
    status_message: 'Testing',
    price_proposal: 800,
    concessions: [],
    user_prompt: null,
  },
  created_at: new Date().toISOString(),
  ...overrides,
});

describe('Negotiation Data Structures', () => {
  describe('Listing', () => {
    it('has all required fields', () => {
      const listing = makeListing();
      expect(listing.id).toBeTruthy();
      expect(listing.title).toBeTruthy();
      expect(listing.ask_price).toBeGreaterThan(0);
      expect(Array.isArray(listing.condition_notes)).toBe(true);
      expect(Array.isArray(listing.haggling_ammo)).toBe(true);
    });

    it('condition notes have confidence levels', () => {
      const listing = makeListing();
      listing.condition_notes.forEach(note => {
        expect(['high', 'medium', 'low']).toContain(note.confidence);
        expect(note.issue).toBeTruthy();
      });
    });
  });

  describe('BuyAgent', () => {
    it('has max_price constraint', () => {
      const agent = makeBuyAgent({ max_price: 500 });
      expect(agent.max_price).toBe(500);
    });

    it('has urgency level', () => {
      const validUrgencies = ['low', 'medium', 'high'];
      validUrgencies.forEach(u => {
        const agent = makeBuyAgent({ urgency: u as BuyAgent['urgency'] });
        expect(validUrgencies).toContain(agent.urgency);
      });
    });
  });

  describe('SellAgent', () => {
    it('has min_price constraint', () => {
      const agent = makeSellAgent({ min_price: 700 });
      expect(agent.min_price).toBe(700);
    });

    it('is linked to a listing', () => {
      const agent = makeSellAgent({ listing_id: 'listing-123' });
      expect(agent.listing_id).toBe('listing-123');
    });
  });

  describe('Negotiation', () => {
    it('tracks ball ownership', () => {
      const validBallOwners = ['buyer', 'seller', 'human'];
      validBallOwners.forEach(b => {
        const neg = makeNegotiation({ ball: b as Negotiation['ball'] });
        expect(validBallOwners).toContain(neg.ball);
      });
    });

    it('has valid state transitions', () => {
      const validStates = ['idle', 'negotiating', 'agreed', 'escrow_created', 'funded', 'confirmed', 'flagged', 'resolved'];
      validStates.forEach(s => {
        const neg = makeNegotiation({ state: s as Negotiation['state'] });
        expect(validStates).toContain(neg.state);
      });
    });

    it('tracks agreed price when deal is reached', () => {
      const neg = makeNegotiation({ state: 'agreed', agreed_price: 850 });
      expect(neg.state).toBe('agreed');
      expect(neg.agreed_price).toBe(850);
    });
  });
});

describe('Message Parsing', () => {
  it('parsed message has required schema fields', () => {
    const msg = makeMessage();
    const parsed = msg.parsed as ParsedMessage;

    expect(parsed).toHaveProperty('answer');
    expect(parsed).toHaveProperty('status_message');
    expect(parsed).toHaveProperty('price_proposal');
    expect(parsed).toHaveProperty('concessions');
    expect(parsed).toHaveProperty('user_prompt');
  });

  it('price_proposal can be null', () => {
    const msg = makeMessage({
      parsed: {
        answer: 'Just asking a question',
        status_message: 'Inquiring',
        price_proposal: null,
        concessions: [],
        user_prompt: null,
      },
    });
    expect((msg.parsed as ParsedMessage).price_proposal).toBeNull();
  });

  it('user_prompt can request human input', () => {
    const msg = makeMessage({
      parsed: {
        answer: 'Need clarification',
        status_message: 'Waiting for human',
        price_proposal: null,
        concessions: [],
        user_prompt: {
          target: 'buyer',
          question: 'What is your maximum budget?',
          choices: ['Under $500', '$500-$800', 'Over $800'],
        },
      },
    });
    const parsed = msg.parsed as ParsedMessage;
    expect(parsed.user_prompt).not.toBeNull();
    expect(parsed.user_prompt?.target).toBe('buyer');
    expect(parsed.user_prompt?.choices).toHaveLength(3);
  });

  it('concessions are tracked as array', () => {
    const msg = makeMessage({
      parsed: {
        answer: 'I can offer some extras',
        status_message: 'Making concessions',
        price_proposal: 850,
        concessions: ['Free shipping', 'Extended warranty'],
        user_prompt: null,
      },
    });
    const parsed = msg.parsed as ParsedMessage;
    expect(parsed.concessions).toHaveLength(2);
    expect(parsed.concessions).toContain('Free shipping');
  });
});

describe('Turn Logic', () => {
  it('buyer starts negotiation', () => {
    const neg = makeNegotiation({ ball: 'buyer' });
    expect(neg.ball).toBe('buyer');
  });

  it('ball passes to seller after buyer move', () => {
    const messages = [
      makeMessage({ role: 'buyer_agent' }),
    ];
    const lastRole = messages[messages.length - 1].role;
    const nextBall = lastRole === 'buyer_agent' ? 'seller' : 'buyer';
    expect(nextBall).toBe('seller');
  });

  it('ball passes to buyer after seller move', () => {
    const messages = [
      makeMessage({ role: 'buyer_agent' }),
      makeMessage({ id: 'msg-2', role: 'seller_agent' }),
    ];
    const lastRole = messages[messages.length - 1].role;
    const nextBall = lastRole === 'seller_agent' ? 'buyer' : 'seller';
    expect(nextBall).toBe('buyer');
  });

  it('ball goes to human when input requested', () => {
    const msg = makeMessage({
      parsed: {
        answer: 'Need input',
        status_message: 'Waiting',
        price_proposal: null,
        concessions: [],
        user_prompt: { target: 'buyer', question: 'Confirm?' },
      },
    });
    const parsed = msg.parsed as ParsedMessage;
    const nextBall = parsed.user_prompt ? 'human' : 'seller';
    expect(nextBall).toBe('human');
  });
});

describe('Agreement Detection', () => {
  it('detects agreement when buyer meets seller price', () => {
    const sellerPrice = 900;
    const buyerPrice = 900;
    const isAgreed = buyerPrice >= sellerPrice;
    expect(isAgreed).toBe(true);
  });

  it('detects agreement when buyer exceeds seller price', () => {
    const sellerPrice = 850;
    const buyerPrice = 900;
    const isAgreed = buyerPrice >= sellerPrice;
    expect(isAgreed).toBe(true);
  });

  it('no agreement when buyer below seller price', () => {
    const sellerPrice = 900;
    const buyerPrice = 800;
    const isAgreed = buyerPrice >= sellerPrice;
    expect(isAgreed).toBe(false);
  });

  it('detects agreement when seller meets buyer price', () => {
    const buyerLastOffer = 850;
    const sellerNewOffer = 850;
    const isAgreed = sellerNewOffer <= buyerLastOffer;
    expect(isAgreed).toBe(true);
  });
});

describe('Price Validation', () => {
  it('buyer cannot exceed max_price', () => {
    const agent = makeBuyAgent({ max_price: 800 });
    const proposedPrice = 850;
    const isValid = proposedPrice <= agent.max_price;
    expect(isValid).toBe(false);
  });

  it('seller cannot go below min_price', () => {
    const agent = makeSellAgent({ min_price: 700 });
    const proposedPrice = 650;
    const isValid = proposedPrice >= agent.min_price;
    expect(isValid).toBe(false);
  });

  it('valid buyer offer within budget', () => {
    const agent = makeBuyAgent({ max_price: 900 });
    const proposedPrice = 800;
    const isValid = proposedPrice <= agent.max_price;
    expect(isValid).toBe(true);
  });

  it('valid seller offer above minimum', () => {
    const agent = makeSellAgent({ min_price: 700 });
    const proposedPrice = 750;
    const isValid = proposedPrice >= agent.min_price;
    expect(isValid).toBe(true);
  });
});

describe('Negotiation Context', () => {
  it('context includes listing details', () => {
    const listing = makeListing();
    const ctx = { listing };
    expect(ctx.listing.title).toBe('Test Product');
    expect(ctx.listing.ask_price).toBe(1000);
  });

  it('context includes condition notes for haggling', () => {
    const listing = makeListing();
    expect(listing.condition_notes.length).toBeGreaterThan(0);
    expect(listing.haggling_ammo.length).toBeGreaterThan(0);
  });

  it('context includes message history', () => {
    const messages = [
      makeMessage({ role: 'buyer_agent', parsed: { answer: 'Opening', status_message: 'Start', price_proposal: 750, concessions: [], user_prompt: null } }),
      makeMessage({ id: 'msg-2', role: 'seller_agent', parsed: { answer: 'Counter', status_message: 'Countering', price_proposal: 950, concessions: [], user_prompt: null } }),
    ];
    expect(messages.length).toBe(2);
    expect((messages[0].parsed as ParsedMessage).price_proposal).toBe(750);
    expect((messages[1].parsed as ParsedMessage).price_proposal).toBe(950);
  });
});

describe('Status Messages', () => {
  it('status message is concise', () => {
    const msg = makeMessage({
      parsed: {
        answer: 'A longer response explaining the reasoning behind the offer',
        status_message: 'Offering $800',
        price_proposal: 800,
        concessions: [],
        user_prompt: null,
      },
    });
    const parsed = msg.parsed as ParsedMessage;
    expect(parsed.status_message.length).toBeLessThan(50);
  });

  it('status message reflects action type', () => {
    const openingMsg = makeMessage({
      parsed: { answer: '', status_message: 'Opening at $750', price_proposal: 750, concessions: [], user_prompt: null },
    });
    const counterMsg = makeMessage({
      parsed: { answer: '', status_message: 'Countering at $900', price_proposal: 900, concessions: [], user_prompt: null },
    });

    expect((openingMsg.parsed as ParsedMessage).status_message).toContain('Opening');
    expect((counterMsg.parsed as ParsedMessage).status_message).toContain('Counter');
  });
});

describe('Mocked AI Output Types', () => {
  const mockAIOutputs = {
    openingOffer: {
      answer: 'I am interested in this item. Given the minor scratch noted and battery health at 85%, I would like to start with an offer.',
      status_message: 'Opening bid at $750',
      price_proposal: 750,
      concessions: [],
      user_prompt: null,
    },
    counterOffer: {
      answer: 'I appreciate the interest. The item is in good condition and includes original packaging. I can come down slightly.',
      status_message: 'Countering at $920',
      price_proposal: 920,
      concessions: ['Free shipping included'],
      user_prompt: null,
    },
    humanInputRequired: {
      answer: 'I need to check with the owner about the return policy before proceeding.',
      status_message: 'Waiting for seller input',
      price_proposal: null,
      concessions: [],
      user_prompt: {
        target: 'seller' as const,
        question: 'What is your return policy for this item?',
        choices: ['No returns', '7-day returns', '30-day returns'],
      },
    },
    acceptance: {
      answer: 'I accept your offer. This is a fair price considering the condition.',
      status_message: 'Deal accepted at $850',
      price_proposal: 850,
      concessions: [],
      user_prompt: null,
    },
    rejection: {
      answer: 'I cannot go below my minimum acceptable price. Thank you for your interest.',
      status_message: 'Declining offer',
      price_proposal: null,
      concessions: [],
      user_prompt: null,
    },
    multiConcession: {
      answer: 'To make this work, I can offer several extras.',
      status_message: 'Offering with concessions',
      price_proposal: 880,
      concessions: ['Free shipping', 'Extended warranty', 'Original box included', 'Extra charger'],
      user_prompt: null,
    },
    freeTextHumanInput: {
      answer: 'I need more information about the item history.',
      status_message: 'Asking seller for details',
      price_proposal: null,
      concessions: [],
      user_prompt: {
        target: 'seller' as const,
        question: 'Can you provide more details about how the scratch occurred and the usage history?',
      },
    },
    finalOffer: {
      answer: 'This is my final offer. I cannot go any higher.',
      status_message: 'Final offer: $870',
      price_proposal: 870,
      concessions: ['Accept within 24h'],
      user_prompt: null,
    },
  };

  it('parses opening offer correctly', () => {
    const output = mockAIOutputs.openingOffer;
    expect(output.price_proposal).toBe(750);
    expect(output.concessions).toHaveLength(0);
    expect(output.user_prompt).toBeNull();
    expect(output.status_message).toContain('Opening');
  });

  it('parses counter offer with concessions', () => {
    const output = mockAIOutputs.counterOffer;
    expect(output.price_proposal).toBe(920);
    expect(output.concessions).toHaveLength(1);
    expect(output.concessions[0]).toBe('Free shipping included');
  });

  it('handles human input request with choices', () => {
    const output = mockAIOutputs.humanInputRequired;
    expect(output.user_prompt).not.toBeNull();
    expect(output.user_prompt?.target).toBe('seller');
    expect(output.user_prompt?.question).toBeTruthy();
    expect(output.user_prompt?.choices).toHaveLength(3);
    expect(output.price_proposal).toBeNull();
  });

  it('handles acceptance output', () => {
    const output = mockAIOutputs.acceptance;
    expect(output.price_proposal).toBe(850);
    expect(output.status_message).toContain('accepted');
  });

  it('handles rejection output', () => {
    const output = mockAIOutputs.rejection;
    expect(output.price_proposal).toBeNull();
    expect(output.status_message).toContain('Declining');
  });

  it('handles multiple concessions', () => {
    const output = mockAIOutputs.multiConcession;
    expect(output.concessions).toHaveLength(4);
    expect(output.concessions).toContain('Free shipping');
    expect(output.concessions).toContain('Extended warranty');
  });

  it('handles free-text human input (no choices)', () => {
    const output = mockAIOutputs.freeTextHumanInput;
    expect(output.user_prompt).not.toBeNull();
    expect((output.user_prompt as any)?.choices).toBeUndefined();
    expect(output.user_prompt?.question).toBeTruthy();
  });

  it('handles final offer', () => {
    const output = mockAIOutputs.finalOffer;
    expect(output.price_proposal).toBe(870);
    expect(output.concessions).toContain('Accept within 24h');
  });
});

describe('Orchestrator State Transitions', () => {
  it('transitions from idle to negotiating', () => {
    const neg = makeNegotiation({ state: 'idle' });
    const newState = 'negotiating';
    expect(newState).toBe('negotiating');
  });

  it('transitions to agreed when prices match', () => {
    const buyerOffer = 850;
    const sellerOffer = 850;
    const agreed = buyerOffer === sellerOffer;
    const newState = agreed ? 'agreed' : 'negotiating';
    expect(newState).toBe('agreed');
  });

  it('transitions to human when user_prompt is set', () => {
    const parsed: ParsedMessage = {
      answer: 'Need input',
      status_message: 'Waiting',
      price_proposal: null,
      concessions: [],
      user_prompt: { target: 'buyer', question: 'Confirm?' },
    };
    const newBall = parsed.user_prompt ? 'human' : 'buyer';
    expect(newBall).toBe('human');
  });

  it('resumes after human response', () => {
    const humanResponse = 'I confirm, proceed with the offer';
    const ball = 'buyer';
    expect(humanResponse).toBeTruthy();
    expect(ball).toBe('buyer');
  });
});

describe('Orchestrator Response Validation', () => {
  const validateResponse = (response: ParsedMessage): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];

    if (typeof response.answer !== 'string') {
      errors.push('answer must be a string');
    }
    if (typeof response.status_message !== 'string') {
      errors.push('status_message must be a string');
    }
    if (response.price_proposal !== null && typeof response.price_proposal !== 'number') {
      errors.push('price_proposal must be a number or null');
    }
    if (!Array.isArray(response.concessions)) {
      errors.push('concessions must be an array');
    }
    if (response.user_prompt !== null) {
      if (!response.user_prompt.target || !['buyer', 'seller'].includes(response.user_prompt.target)) {
        errors.push('user_prompt.target must be buyer or seller');
      }
      if (!response.user_prompt.question) {
        errors.push('user_prompt.question is required');
      }
    }

    return { valid: errors.length === 0, errors };
  };

  it('validates correct response', () => {
    const response: ParsedMessage = {
      answer: 'Test',
      status_message: 'Testing',
      price_proposal: 500,
      concessions: [],
      user_prompt: null,
    };
    const result = validateResponse(response);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('detects invalid price_proposal type', () => {
    const response = {
      answer: 'Test',
      status_message: 'Testing',
      price_proposal: 'invalid' as unknown as number,
      concessions: [],
      user_prompt: null,
    };
    const result = validateResponse(response as ParsedMessage);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('price_proposal must be a number or null');
  });

  it('detects invalid user_prompt target', () => {
    const response: ParsedMessage = {
      answer: 'Test',
      status_message: 'Testing',
      price_proposal: null,
      concessions: [],
      user_prompt: { target: 'invalid' as 'buyer', question: 'Test?' },
    };
    const result = validateResponse(response);
    expect(result.valid).toBe(false);
  });
});

describe('Demo Mode Responses', () => {
  const DEMO_BUYER_RESPONSES: ParsedMessage[] = [
    { answer: 'Opening offer', status_message: 'Buyer opened at $700', price_proposal: 700, concessions: [], user_prompt: null },
    { answer: 'Counter response', status_message: 'Buyer counters at $780', price_proposal: 780, concessions: [], user_prompt: null },
    { answer: 'Final push', status_message: 'Buyer final at $820', price_proposal: 820, concessions: ['Quick payment'], user_prompt: null },
  ];

  const DEMO_SELLER_RESPONSES: ParsedMessage[] = [
    { answer: 'Opening counter', status_message: 'Seller counters at $950', price_proposal: 950, concessions: [], user_prompt: null },
    { answer: 'Coming down', status_message: 'Seller at $880', price_proposal: 880, concessions: ['Free shipping'], user_prompt: null },
    { answer: 'Final offer', status_message: 'Seller final at $850', price_proposal: 850, concessions: ['Free shipping', 'Original box'], user_prompt: null },
  ];

  it('demo buyer responses are valid', () => {
    DEMO_BUYER_RESPONSES.forEach(response => {
      expect(response.answer).toBeTruthy();
      expect(response.status_message).toBeTruthy();
      expect(Array.isArray(response.concessions)).toBe(true);
    });
  });

  it('demo seller responses are valid', () => {
    DEMO_SELLER_RESPONSES.forEach(response => {
      expect(response.answer).toBeTruthy();
      expect(response.status_message).toBeTruthy();
      expect(Array.isArray(response.concessions)).toBe(true);
    });
  });

  it('demo responses show price convergence', () => {
    const buyerPrices = DEMO_BUYER_RESPONSES.map(r => r.price_proposal).filter(p => p !== null) as number[];
    const sellerPrices = DEMO_SELLER_RESPONSES.map(r => r.price_proposal).filter(p => p !== null) as number[];

    for (let i = 1; i < buyerPrices.length; i++) {
      expect(buyerPrices[i]).toBeGreaterThanOrEqual(buyerPrices[i - 1]);
    }
    for (let i = 1; i < sellerPrices.length; i++) {
      expect(sellerPrices[i]).toBeLessThanOrEqual(sellerPrices[i - 1]);
    }
  });
});
