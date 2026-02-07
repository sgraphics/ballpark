import { create } from 'zustand';
import type {
  Listing,
  BuyAgent,
  SellAgent,
  Negotiation,
  NegMessage,
  AppEvent,
  Match,
  User,
} from '@/types/database';

type SidebarTab = 'feed' | 'listings' | 'sell-agents' | 'buy-agents' | 'arena' | 'admin';

interface AppState {
  currentUser: User | null;
  sidebarTab: SidebarTab;
  listings: Listing[];
  sellAgents: SellAgent[];
  buyAgents: BuyAgent[];
  negotiations: Negotiation[];
  messages: Record<string, NegMessage[]>;
  events: AppEvent[];
  matches: Match[];
  categoryFilter: string;
  searchQuery: string;
  isLoading: boolean;

  setCurrentUser: (user: User | null) => void;
  setSidebarTab: (tab: SidebarTab) => void;
  setListings: (listings: Listing[]) => void;
  addListing: (listing: Listing) => void;
  setSellAgents: (agents: SellAgent[]) => void;
  addSellAgent: (agent: SellAgent) => void;
  setBuyAgents: (agents: BuyAgent[]) => void;
  addBuyAgent: (agent: BuyAgent) => void;
  setNegotiations: (negotiations: Negotiation[]) => void;
  updateNegotiation: (id: string, updates: Partial<Negotiation>) => void;
  setMessages: (negId: string, messages: NegMessage[]) => void;
  addMessage: (negId: string, message: NegMessage) => void;
  setEvents: (events: AppEvent[]) => void;
  addEvent: (event: AppEvent) => void;
  setMatches: (matches: Match[]) => void;
  addMatch: (match: Match) => void;
  updateMatch: (id: string, updates: Partial<Match>) => void;
  setCategoryFilter: (category: string) => void;
  setSearchQuery: (query: string) => void;
  setIsLoading: (loading: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
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

  setCurrentUser: (user) => set({ currentUser: user }),
  setSidebarTab: (tab) => set({ sidebarTab: tab }),
  setListings: (listings) => set({ listings }),
  addListing: (listing) => set((s) => ({ listings: [listing, ...s.listings] })),
  setSellAgents: (sellAgents) => set({ sellAgents }),
  addSellAgent: (agent) => set((s) => ({ sellAgents: [agent, ...s.sellAgents] })),
  setBuyAgents: (buyAgents) => set({ buyAgents }),
  addBuyAgent: (agent) => set((s) => ({ buyAgents: [agent, ...s.buyAgents] })),
  setNegotiations: (negotiations) => set({ negotiations }),
  updateNegotiation: (id, updates) =>
    set((s) => ({
      negotiations: s.negotiations.map((n) =>
        n.id === id ? { ...n, ...updates } : n
      ),
    })),
  setMessages: (negId, messages) =>
    set((s) => ({ messages: { ...s.messages, [negId]: messages } })),
  addMessage: (negId, message) =>
    set((s) => ({
      messages: {
        ...s.messages,
        [negId]: [...(s.messages[negId] || []), message],
      },
    })),
  setEvents: (events) => set({ events }),
  addEvent: (event) => set((s) => ({ events: [event, ...s.events] })),
  setMatches: (matches) => set({ matches }),
  addMatch: (match) => set((s) => ({ matches: [match, ...s.matches] })),
  updateMatch: (id, updates) =>
    set((s) => ({
      matches: s.matches.map((m) => (m.id === id ? { ...m, ...updates } : m)),
    })),
  setCategoryFilter: (categoryFilter) => set({ categoryFilter }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setIsLoading: (isLoading) => set({ isLoading }),
}));

export type { SidebarTab };
