export interface User {
  id: string;
  privy_id: string;
  wallet_address: string;
  created_at: string;
}

export type ListingStatus = 'draft' | 'active' | 'negotiating' | 'sold' | 'cancelled';

export interface ConditionNote {
  issue: string;
  confidence: 'high' | 'medium' | 'low';
}

export interface Listing {
  id: string;
  seller_user_id: string;
  title: string;
  description: string;
  category: string;
  structured: Record<string, unknown>;
  ask_price: number;
  condition_notes: ConditionNote[];
  haggling_ammo: string[];
  image_urls: string[];
  hero_image_url: string | null;
  status: ListingStatus;
  created_at: string;
  updated_at: string;
}

export interface SellAgent {
  id: string;
  user_id: string;
  listing_id: string;
  name: string;
  min_price: number;
  urgency: 'low' | 'medium' | 'high';
  preferences: Record<string, unknown>;
  created_at: string;
}

export interface BuyAgent {
  id: string;
  user_id: string;
  name: string;
  category: string;
  filters: Record<string, unknown>;
  prompt: string;
  max_price: number;
  urgency: 'low' | 'medium' | 'high';
  created_at: string;
}

export type MatchStatus = 'potential' | 'negotiating' | 'dismissed';

export interface Match {
  id: string;
  buy_agent_id: string;
  listing_id: string;
  score: number;
  reason: string;
  status: MatchStatus;
  created_at: string;
}

export type NegotiationState =
  | 'idle'
  | 'negotiating'
  | 'agreed'
  | 'escrow_created'
  | 'funded'
  | 'confirmed'
  | 'flagged'
  | 'resolved';

export type BallOwner = 'buyer' | 'seller' | 'human';

export interface Negotiation {
  id: string;
  buy_agent_id: string;
  listing_id: string;
  state: NegotiationState;
  agreed_price: number | null;
  ball: BallOwner;
  created_at: string;
  updated_at: string;
}

export type MessageRole = 'buyer_agent' | 'seller_agent' | 'system' | 'human';

export interface ParsedMessage {
  answer: string;
  status_message: string;
  price_proposal: number | null;
  concessions: string[];
  user_prompt: {
    target: 'buyer' | 'seller';
    question: string;
    choices?: string[];
  } | null;
}

export interface NegMessage {
  id: string;
  negotiation_id: string;
  role: MessageRole;
  raw: string;
  parsed: ParsedMessage;
  created_at: string;
}

export type EventType =
  | 'listing_created'
  | 'match_found'
  | 'negotiation_started'
  | 'buyer_proposes'
  | 'seller_counters'
  | 'human_input_required'
  | 'deal_agreed'
  | 'escrow_created'
  | 'escrow_funded'
  | 'delivery_confirmed'
  | 'issue_flagged'
  | 'issue_resolved';

export interface AppEvent {
  id: string;
  user_id: string | null;
  type: EventType;
  payload: Record<string, unknown>;
  created_at: string;
}

export interface Escrow {
  id: string;
  negotiation_id: string;
  contract_address: string;
  item_id: string;
  tx_create: string | null;
  tx_deposit: string | null;
  tx_confirm: string | null;
  tx_flag: string | null;
  tx_update_price: string | null;
  created_at: string;
}
