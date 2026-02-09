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

Phase rules (based on your turn number):
- Turns 1-3 (Discovery Phase): Ask open-ended questions to uncover hidden issues.
  Examples: "Has this item been repaired?", "Why are you selling?", "Any known defects not shown in photos?"
  Do NOT propose a price during the discovery phase. Set price_proposal to null.
- Turns 4+  (Negotiation Phase): Now negotiate on price.
  Start ~15-30% below ask price depending on urgency. Raise gradually.

Negotiation rules:
1. NEVER accept a price above max_price
2. When proposing or changing a price, ALWAYS explain your reasoning referencing specific condition notes, haggling ammo, or information from the seller's earlier answers
3. Use objective facts from haggling_ammo as leverage
4. Be firm but fair -- cite concrete evidence for lower offers
5. NEVER invent facts not provided in the listing data or seller responses
6. You may ONLY ask questions from the BUYER human (target: "buyer"). NEVER set target to "seller"
7. You can freely converse with the seller agent without involving humans

Output ONLY valid JSON matching this schema:
{
  "answer": "Your response to the seller (1-3 sentences)",
  "status_message": "One-line status for UI (e.g., 'Asking about item history')",
  "price_proposal": number or null,
  "concessions": ["any concessions you're offering"],
  "user_prompt": { "target": "buyer", "question": "...", "choices": ["..."] } or null
}`;

const SELLER_SYSTEM_PROMPT = `You are a seller agent negotiating on behalf of a human seller in a marketplace.

Your constraints:
- Ask price: {ask_price}
- Min acceptable price: {min_price}
- Has min price set: {has_min_price}
- Urgency: {urgency}

Negotiation rules:
1. NEVER accept a price below min_price (if set)
2. When the buyer provides reasoning for a lower price, evaluate whether it is substantial or trivial:
   - If the issue was ALREADY visible in photos or listed in condition notes, push back firmly ("This was already reflected in the asking price")
   - Only concede for legitimate hidden issues discovered through questioning
3. Defend the ask price using condition notes and haggling_ammo -- highlight positives
4. Counter offers strategically, lowering gradually based on urgency
5. NEVER invent facts not provided in the listing data
6. You may ONLY ask questions from the SELLER human (target: "seller"). NEVER set target to "buyer"
7. You can freely converse with the buyer agent without involving humans

CRITICAL -- Min price enforcement:
- If has_min_price is false (no min price set by seller), you MUST ask your seller for their minimum acceptable price via user_prompt BEFORE accepting or countering any price below the ask price
- If the buyer's latest offer is below your min_price, you MUST ask your seller whether to accept, counter, or reject via user_prompt

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

/** Count how many turns the given role has taken so far. */
function countTurns(messages: NegMessage[], role: 'buyer_agent' | 'seller_agent'): number {
  return messages.filter(m => m.role === role).length;
}

function buildBuyerPrompt(ctx: OrchestrationContext): string {
  const { listing, buyAgent, messages } = ctx;

  const buyerTurn = countTurns(messages, 'buyer_agent') + 1; // next turn number

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

YOUR TURN NUMBER: ${buyerTurn}
PHASE: ${buyerTurn <= 3 ? 'DISCOVERY (ask questions, do NOT propose price)' : 'NEGOTIATION (propose/counter prices with reasoning)'}

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

  const hasMinPrice = !!(sellAgent?.min_price && sellAgent.min_price > 0);
  const minPrice = sellAgent?.min_price || Math.round(listing.ask_price * 0.7);
  const urgency = sellAgent?.urgency || 'medium';

  // Find the latest buyer price proposal to check against min_price
  const lastBuyerOffer = [...messages].reverse()
    .find(m => m.role === 'buyer_agent' && (m.parsed || {}).price_proposal != null);
  const buyerLastPrice = lastBuyerOffer?.parsed?.price_proposal ?? null;

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

  let minPriceWarning = '';
  if (!hasMinPrice) {
    minPriceWarning = '\nWARNING: No minimum price has been set by the seller. You MUST ask your seller for a min price via user_prompt before accepting or countering below ask price.';
  } else if (buyerLastPrice !== null && buyerLastPrice < minPrice) {
    minPriceWarning = `\nWARNING: Buyer's latest offer ($${buyerLastPrice}) is BELOW your min price ($${minPrice}). Ask your seller whether to accept, counter, or reject via user_prompt.`;
  }

  return `${SELLER_SYSTEM_PROMPT
    .replace('{ask_price}', `$${listing.ask_price}`)
    .replace('{min_price}', hasMinPrice ? `$${minPrice}` : '(not set)')
    .replace('{has_min_price}', String(hasMinPrice))
    .replace('{urgency}', urgency)}
${minPriceWarning}

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

/**
 * Parse agent response and enforce prompt ownership:
 * buyer_agent can only prompt 'buyer', seller_agent can only prompt 'seller'.
 */
function parseAgentResponse(raw: string, role: 'buyer_agent' | 'seller_agent'): ParsedMessage {
  const cleaned = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();

  const allowedTarget = role === 'buyer_agent' ? 'buyer' : 'seller';

  try {
    const parsed = JSON.parse(cleaned);

    let userPrompt: ParsedMessage['user_prompt'] = null;
    if (parsed.user_prompt && typeof parsed.user_prompt === 'object') {
      // Enforce: override target to the allowed value regardless of what the AI said
      userPrompt = {
        target: allowedTarget as 'buyer' | 'seller',
        question: String(parsed.user_prompt.question || ''),
        choices: Array.isArray(parsed.user_prompt.choices) ? parsed.user_prompt.choices.map(String) : undefined,
      };
    }

    return {
      answer: String(parsed.answer || ''),
      status_message: String(parsed.status_message || ''),
      price_proposal: typeof parsed.price_proposal === 'number' ? parsed.price_proposal : null,
      concessions: Array.isArray(parsed.concessions) ? parsed.concessions.map(String) : [],
      user_prompt: userPrompt,
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
  const model = client.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const result = await model.generateContent(prompt);
  const raw = result.response.text();
  const parsed = parseAgentResponse(raw, role);

  const { isAgreed, agreedPrice } = checkAgreement(ctx, parsed, role);

  let newBall: BallOwner;
  if (isAgreed) {
    // After agreement, ball goes to seller (seller must create escrow)
    newBall = 'seller';
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

  const buyerTurnCount = countTurns(ctx.messages, 'buyer_agent');

  const lastPrice = [...ctx.messages].reverse()
    .find(m => (m.parsed || {}).price_proposal != null)?.parsed?.price_proposal ?? null;

  const askPrice = ctx.listing.ask_price;
  const maxPrice = ctx.buyAgent.max_price;

  let price: number | null;
  let answer: string;
  let statusMessage: string;
  let userPrompt: ParsedMessage['user_prompt'] = null;

  if (role === 'buyer_agent') {
    if (buyerTurnCount < 3) {
      // Discovery phase: ask questions, no price
      const questions = [
        `I'm interested in this ${ctx.listing.title}. Could you tell me about its history? Has it been repaired or modified in any way?`,
        `Thanks for the info. What's the reason for selling? And are there any issues not visible in the photos?`,
        `One more question -- how old is this item and how much use has it seen?`,
      ];
      answer = questions[buyerTurnCount] || questions[0];
      statusMessage = 'Asking about item condition';
      price = null;
    } else if (!lastPrice) {
      price = Math.round(askPrice * 0.75);
      answer = `Based on what I've learned, including the condition notes, I'd like to start at $${price}. The noted issues factor into this offer.`;
      statusMessage = `Opening offer: $${price}`;
    } else {
      price = Math.min(Math.round(lastPrice * 1.05), maxPrice);
      answer = `Considering the condition, I can go up to $${price}, but that's near my limit.`;
      statusMessage = `Raised to $${price}`;
    }
  } else {
    // Seller agent
    const hasMinPrice = !!(ctx.sellAgent?.min_price && ctx.sellAgent.min_price > 0);
    const minPrice = ctx.sellAgent?.min_price || Math.round(askPrice * 0.7);

    if (!lastPrice) {
      price = askPrice;
      answer = `Thank you for your interest and questions. The asking price of $${askPrice} already reflects the item's condition honestly.`;
      statusMessage = `Holding at $${askPrice}`;
    } else if (!hasMinPrice && lastPrice < askPrice) {
      // No min price set -- ask seller
      price = null;
      answer = `I need to check with the seller about this offer.`;
      statusMessage = 'Consulting seller on minimum price';
      userPrompt = {
        target: 'seller',
        question: `The buyer is offering $${lastPrice} for your item (asking $${askPrice}). What's the lowest price you'd accept?`,
        choices: [`Accept $${lastPrice}`, `Counter at $${Math.round((askPrice + lastPrice) / 2)}`, 'Reject and hold firm'],
      };
    } else if (lastPrice < minPrice) {
      price = null;
      answer = `This offer is below what I can accept. Let me check with the seller.`;
      statusMessage = 'Offer below minimum -- consulting seller';
      userPrompt = {
        target: 'seller',
        question: `The buyer offered $${lastPrice}, which is below your minimum of $${minPrice}. How should I respond?`,
        choices: [`Accept $${lastPrice} anyway`, `Counter at $${minPrice}`, 'Reject firmly'],
      };
    } else {
      price = Math.round(lastPrice + (askPrice - lastPrice) * 0.5);
      answer = `I appreciate the offer. The issues you mentioned were already factored into the asking price. I could meet you at $${price}.`;
      statusMessage = `Countered at $${price}`;
    }
  }

  const parsed: ParsedMessage = {
    answer,
    status_message: statusMessage,
    price_proposal: price,
    concessions: [],
    user_prompt: userPrompt,
  };

  const { isAgreed, agreedPrice } = checkAgreement(ctx, parsed, role);

  let newBall: BallOwner;
  if (isAgreed) {
    newBall = 'seller';
  } else if (parsed.user_prompt) {
    newBall = 'human';
  } else {
    newBall = role === 'buyer_agent' ? 'seller' : 'buyer';
  }

  return {
    role,
    raw: JSON.stringify(parsed, null, 2),
    parsed,
    newBall,
    isAgreed,
    agreedPrice,
  };
}

export function isGeminiConfigured(): boolean {
  return !!process.env.GEMINI_API_KEY;
}
