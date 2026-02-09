import { GoogleGenerativeAI } from '@google/generative-ai';
import type {
  Listing,
  BuyAgent,
  SellAgent,
  Negotiation,
  NegMessage,
  ParsedMessage,
  BallOwner
} from '@/types/database';

const BUYER_SYSTEM_PROMPT = `You are a buyer agent negotiating on behalf of a human buyer in a marketplace.

Your constraints:
- Max price: {max_price}
- Preferences: {preferences}
- Urgency: {urgency}

Negotiation rules:
1. NEVER accept a price above max_price
2. Start with an offer ~15-30% below ask price depending on urgency
3. Raise your offer gradually, using condition issues as leverage
4. If you need information from your buyer, use user_prompt
5. Be firm but fair. Use objective facts from haggling_ammo.
6. NEVER invent facts not provided in the listing data

Output ONLY valid JSON matching this schema:
{
  "answer": "Your response to the seller (1-3 sentences)",
  "status_message": "One-line status for UI (e.g., 'Countering at $X')",
  "price_proposal": number or null,
  "concessions": ["any concessions you're offering"],
  "user_prompt": { "target": "buyer", "question": "...", "choices": ["..."] } or null
}`;

const SELLER_SYSTEM_PROMPT = `You are a seller agent negotiating on behalf of a human seller in a marketplace.

Your constraints:
- Ask price: {ask_price}
- Min acceptable price: {min_price}
- Urgency: {urgency}

Negotiation rules:
1. NEVER accept a price below min_price
2. Defend the ask price with condition notes and haggling_ammo
3. Counter offers strategically, lowering gradually based on urgency
4. If you need information from your seller, use user_prompt
5. Highlight positive aspects without inventing facts
6. NEVER invent facts not provided in the listing data

Output ONLY valid JSON matching this schema:
{
  "answer": "Your response to the buyer (1-3 sentences)",
  "status_message": "One-line status for UI (e.g., 'Holding firm at $X')",
  "price_proposal": number or null,
  "concessions": ["any concessions you're offering"],
  "user_prompt": { "target": "seller", "question": "...", "choices": ["..."] } or null
}`;

export interface OrchestrationContext {
  listing: Listing;
  buyAgent: BuyAgent;
  sellAgent: SellAgent | null;
  negotiation: Negotiation;
  messages: NegMessage[];
}

export interface OrchestrationResult {
  role: 'buyer_agent' | 'seller_agent';
  raw: string;
  parsed: ParsedMessage;
  newBall: BallOwner;
  isAgreed: boolean;
  agreedPrice: number | null;
}

function buildBuyerPrompt(ctx: OrchestrationContext): string {
  const { listing, buyAgent, messages } = ctx;

  const history = messages.map(m => {
    const parsed = m.parsed || {} as ParsedMessage;
    const prefix = m.role === 'buyer_agent' ? 'YOU' :
                   m.role === 'seller_agent' ? 'SELLER' :
                   m.role === 'human' ? 'YOUR BUYER' : 'SYSTEM';
    return `${prefix}: ${parsed.answer || m.raw}${parsed.price_proposal ? ` [Proposed: $${parsed.price_proposal}]` : ''}`;
  }).join('\n');

  const conditionNotes = Array.isArray(listing.condition_notes)
    ? listing.condition_notes.map(n => `${n.issue} (${n.confidence} confidence)`).join('; ')
    : '';
  const hagglingAmmo = Array.isArray(listing.haggling_ammo)
    ? listing.haggling_ammo.join('; ')
    : '';

  return `${BUYER_SYSTEM_PROMPT
    .replace('{max_price}', `$${buyAgent.max_price}`)
    .replace('{preferences}', buyAgent.prompt || 'None specified')
    .replace('{urgency}', buyAgent.urgency)}

LISTING:
- Title: ${listing.title}
- Ask Price: $${listing.ask_price}
- Category: ${listing.category}
- Description: ${listing.description}
- Condition Notes: ${conditionNotes || 'None'}
- Haggling Ammo: ${hagglingAmmo || 'None'}
- Structured Data: ${JSON.stringify(listing.structured || {})}

NEGOTIATION HISTORY:
${history || '(Starting negotiation)'}

Your turn. Respond with valid JSON only.`;
}

function buildSellerPrompt(ctx: OrchestrationContext): string {
  const { listing, sellAgent, messages } = ctx;

  const minPrice = sellAgent?.min_price || Math.round(listing.ask_price * 0.7);
  const urgency = sellAgent?.urgency || 'medium';

  const history = messages.map(m => {
    const parsed = m.parsed || {} as ParsedMessage;
    const prefix = m.role === 'seller_agent' ? 'YOU' :
                   m.role === 'buyer_agent' ? 'BUYER' :
                   m.role === 'human' ? 'YOUR SELLER' : 'SYSTEM';
    return `${prefix}: ${parsed.answer || m.raw}${parsed.price_proposal ? ` [Proposed: $${parsed.price_proposal}]` : ''}`;
  }).join('\n');

  const conditionNotes = Array.isArray(listing.condition_notes)
    ? listing.condition_notes.map(n => `${n.issue} (${n.confidence} confidence)`).join('; ')
    : '';
  const hagglingAmmo = Array.isArray(listing.haggling_ammo)
    ? listing.haggling_ammo.join('; ')
    : '';

  return `${SELLER_SYSTEM_PROMPT
    .replace('{ask_price}', `$${listing.ask_price}`)
    .replace('{min_price}', `$${minPrice}`)
    .replace('{urgency}', urgency)}

LISTING:
- Title: ${listing.title}
- Ask Price: $${listing.ask_price}
- Category: ${listing.category}
- Description: ${listing.description}
- Condition Notes: ${conditionNotes || 'None'}
- Haggling Ammo: ${hagglingAmmo || 'None'}
- Structured Data: ${JSON.stringify(listing.structured || {})}

NEGOTIATION HISTORY:
${history || '(Starting negotiation)'}

Your turn. Respond with valid JSON only.`;
}

function parseAgentResponse(raw: string): ParsedMessage {
  const cleaned = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();

  try {
    const parsed = JSON.parse(cleaned);
    return {
      answer: String(parsed.answer || ''),
      status_message: String(parsed.status_message || ''),
      price_proposal: typeof parsed.price_proposal === 'number' ? parsed.price_proposal : null,
      concessions: Array.isArray(parsed.concessions) ? parsed.concessions.map(String) : [],
      user_prompt: parsed.user_prompt && typeof parsed.user_prompt === 'object' ? {
        target: parsed.user_prompt.target === 'seller' ? 'seller' : 'buyer',
        question: String(parsed.user_prompt.question || ''),
        choices: Array.isArray(parsed.user_prompt.choices) ? parsed.user_prompt.choices.map(String) : undefined,
      } : null,
    };
  } catch {
    return {
      answer: raw,
      status_message: 'Processing response...',
      price_proposal: null,
      concessions: [],
      user_prompt: null,
    };
  }
}

function checkAgreement(
  ctx: OrchestrationContext,
  newMessage: ParsedMessage,
  role: 'buyer_agent' | 'seller_agent'
): { isAgreed: boolean; agreedPrice: number | null } {
  if (newMessage.price_proposal === null) {
    return { isAgreed: false, agreedPrice: null };
  }

  const lastOtherMessage = [...ctx.messages].reverse().find(m =>
    (role === 'buyer_agent' && m.role === 'seller_agent') ||
    (role === 'seller_agent' && m.role === 'buyer_agent')
  );

  const otherParsed = lastOtherMessage?.parsed || {} as ParsedMessage;
  if (!otherParsed.price_proposal) {
    return { isAgreed: false, agreedPrice: null };
  }

  if (role === 'buyer_agent') {
    if (newMessage.price_proposal >= otherParsed.price_proposal) {
      return { isAgreed: true, agreedPrice: otherParsed.price_proposal };
    }
  } else {
    if (newMessage.price_proposal <= otherParsed.price_proposal) {
      return { isAgreed: true, agreedPrice: otherParsed.price_proposal };
    }
  }

  return { isAgreed: false, agreedPrice: null };
}

export async function runOrchestrationStep(
  ctx: OrchestrationContext
): Promise<OrchestrationResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not configured');
  }

  const role: 'buyer_agent' | 'seller_agent' =
    ctx.negotiation.ball === 'buyer' ? 'buyer_agent' : 'seller_agent';

  const prompt = role === 'buyer_agent'
    ? buildBuyerPrompt(ctx)
    : buildSellerPrompt(ctx);

  const client = new GoogleGenerativeAI(apiKey);
  const model = client.getGenerativeModel({ model: 'gemini-3-flash-preview' });

  const result = await model.generateContent(prompt);
  const raw = result.response.text();
  const parsed = parseAgentResponse(raw);

  const { isAgreed, agreedPrice } = checkAgreement(ctx, parsed, role);

  let newBall: BallOwner;
  if (isAgreed) {
    newBall = 'buyer';
  } else if (parsed.user_prompt) {
    newBall = 'human';
  } else {
    newBall = role === 'buyer_agent' ? 'seller' : 'buyer';
  }

  return {
    role,
    raw,
    parsed,
    newBall,
    isAgreed,
    agreedPrice,
  };
}

export function generateDemoResponse(
  ctx: OrchestrationContext
): OrchestrationResult {
  const role: 'buyer_agent' | 'seller_agent' =
    ctx.negotiation.ball === 'buyer' ? 'buyer_agent' : 'seller_agent';

  const lastPrice = [...ctx.messages].reverse()
    .find(m => (m.parsed || {}).price_proposal != null)?.parsed?.price_proposal ?? null;

  const askPrice = ctx.listing.ask_price;
  const maxPrice = ctx.buyAgent.max_price;

  let price: number;
  let answer: string;
  let statusMessage: string;

  if (role === 'buyer_agent') {
    if (!lastPrice) {
      price = Math.round(askPrice * 0.75);
      answer = `I'm interested in this ${ctx.listing.title}. Given the condition notes, I'd like to start at $${price}.`;
      statusMessage = `Opening offer: $${price}`;
    } else {
      price = Math.min(Math.round(lastPrice * 1.05), maxPrice);
      answer = `I can go up to $${price}, but that's getting close to my limit.`;
      statusMessage = `Raised to $${price}`;
    }
  } else {
    if (!lastPrice) {
      price = askPrice;
      answer = `Thank you for your interest. The asking price of $${askPrice} reflects the quality.`;
      statusMessage = `Holding at $${askPrice}`;
    } else {
      price = Math.round(lastPrice + (askPrice - lastPrice) * 0.5);
      answer = `I appreciate the offer. I could meet you at $${price}.`;
      statusMessage = `Countered at $${price}`;
    }
  }

  const parsed: ParsedMessage = {
    answer,
    status_message: statusMessage,
    price_proposal: price,
    concessions: [],
    user_prompt: null,
  };

  const { isAgreed, agreedPrice } = checkAgreement(ctx, parsed, role);

  return {
    role,
    raw: JSON.stringify(parsed, null, 2),
    parsed,
    newBall: isAgreed ? 'buyer' : (role === 'buyer_agent' ? 'seller' : 'buyer'),
    isAgreed,
    agreedPrice,
  };
}

export function isGeminiConfigured(): boolean {
  return !!process.env.GEMINI_API_KEY;
}
