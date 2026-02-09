# Ballpark - Agentic Marketplace TODO



## Project Overview
An agentic marketplace where AI buyer/seller agents negotiate on behalf of users, with escrow-backed transactions.

## CHANGE LOG
- **Removed `@google-cloud/storage`** from dependencies. It pulls in a massive dependency tree (including `bn.js` which has npm registry issues causing 1h+ installs). GCS signed URLs will be generated via raw `fetch` calls to the GCS JSON API using a service account JWT, keeping the same functionality with zero extra deps.
- GCS env vars remain: `GCS_BUCKET`, `GCP_PROJECT`, `GCP_SERVICE_ACCOUNT_JSON`

---

## MILESTONE 1: Foundation & Infrastructure [DONE]
**Status: COMPLETE**

### 1.1 Project Setup
- [x] Convert from Vite to Next.js 14 (App Router)
- [x] Configure TypeScript, TailwindCSS, ESLint
- [x] Set up environment variables structure
- [x] Install core dependencies (pg, ethers, @privy-io/react-auth, @google/generative-ai)
- [x] Create project folder structure
- [x] Write unit tests for project configuration

### 1.2 Database Setup (Postgres)
- [x] Set up node-postgres (pg) connection with pooling
- [x] Create migration system with tracking table (schema_migrations)
- [x] Create auto-migration runner on app startup
- [x] Write migrations for all 10 tables
- [x] Write unit tests for migrations (11 tests)

### 1.3 Base UI
- [x] Zustand store with all entities
- [x] UI components: Button, Card, Badge, Input, Select
- [x] Layout: Sidebar, Header, MainLayout
- [x] Home feed with EventCard, CategoryFilter
- [x] 6 categories with explicit structured fields
- [x] 64 unit tests passing

---

## MILESTONE 2: Listings & Sell Agent Flow [DONE]
**Status: COMPLETE - 100 tests passing, build clean**

### 2.1 Google Cloud Storage Integration
- [x] GCS V4 signed URL generation using raw crypto (src/lib/gcs.ts)
- [x] Signed URL endpoint: POST /api/uploads/sign
- [x] Demo mode fallback with Pexels images when GCS not configured
- [x] 9 unit tests for GCS module

### 2.2 Gemini Image Analysis
- [x] Gemini API client using @google/generative-ai (src/lib/gemini.ts)
- [x] Analysis endpoint: POST /api/analyze-images
- [x] Full analysis output: title, description, category, condition notes, haggling ammo
- [x] Demo mode fallback when Gemini not configured
- [x] 7 unit tests for Gemini module

### 2.3 New Sell Agent + Listing Flow
- [x] 3-step wizard: Upload -> AI Analysis -> Confirm & Save
- [x] Image upload with drag-drop, previews, cover photo (src/components/sell/)
- [x] AI analysis display with condition notes + haggling ammo chips
- [x] Category-specific structured fields form
- [x] API endpoints: POST /api/listings, POST /api/sell-agents, POST /api/analyze-images
- [x] 20 unit tests for listing logic

### 2.4 Home Feed & Listing Display
- [x] Listing detail page: image gallery, structured facts, condition notes, haggling ammo, status rail
- [x] Listings browse page: grid/list toggle, category filter, search, 6 demo listings
- [x] ListingCard component with image, price, category badge, condition info

---

## MILESTONE 3: Buy Agent & Matching System [DONE]
**Status: COMPLETE - 138 tests passing, build clean**

### 3.1 Buy Agent Creation
- [x] Create buy agent form (src/components/buy/buy-agent-form.tsx):
  - [x] Category + structured filters selection
  - [x] Max price input
  - [x] Free-text preferences prompt
  - [x] Urgency setting
- [x] Create API endpoint: POST /api/buy-agents (src/app/api/buy-agents/route.ts)
- [x] Buy agent creation page (src/app/buy/new/page.tsx)
- [x] 19 unit tests for buy agent creation + match store operations

### 3.2 Finder/Matching System
- [x] Create finder job endpoint: POST /api/finder/run (src/app/api/finder/run/route.ts)
- [x] Implement matching logic (src/lib/finder.ts):
  - [x] Query listings by category + filters
  - [x] Score matches by price, filter match, condition notes, haggling ammo
  - [x] Insert to matches table, skip existing matches
- [x] Add manual "Run Finder" button in UI
- [x] Create matches display in My Buy Agents section
- [x] Matches API with GET + PATCH (src/app/api/matches/route.ts)
- [x] 19 unit tests for matching logic

### 3.3 Potential Matches UI
- [x] Display potential matches for each buy agent with score indicator
- [x] Buy agent card component (src/components/buy/buy-agent-card.tsx)
- [x] Match card component (src/components/buy/match-card.tsx)
- [x] "Negotiate" button to start negotiation
- [x] "Dismiss" button to remove match
- [x] My Buy Agents page with agent list + matches panel (src/app/buy/page.tsx)
- [x] Store: addMatch, updateMatch operations
- [x] Demo data for agents and matches

---

## MILESTONE 4: Negotiation & Duel Arena [DONE]
**Status: COMPLETE - 168 tests passing, build clean**

### 4.1 Orchestration Engine
- [x] Create orchestrator service (src/lib/orchestrator.ts):
  - [x] POST /api/orchestrate/step endpoint
  - [x] Context builder (listing, facts, constraints, history)
  - [x] Gemini prompt templates (buyer/seller roles)
  - [x] JSON schema enforcement for output
  - [x] Demo mode fallback when Gemini not configured
- [x] Implement turn logic (buyer -> seller -> buyer...)
- [x] Create message storage with parsed JSON
- [x] Negotiations API (src/app/api/negotiations/route.ts)
- [x] Messages API (src/app/api/messages/route.ts)
- [x] 30 unit tests for orchestration logic

### 4.2 Real-time Updates (SSE)
- [x] Set up Server-Sent Events endpoint: GET /api/negotiations/[id]/stream
- [x] SSE connection management (src/lib/sse.ts)
- [x] Initial data + keepalive implementation
- [x] Client-side EventSource integration in arena page

### 4.3 Status Rail Component
- [x] Create status rail UI (src/components/arena/status-rail.tsx)
- [x] Color-coded status cards (buyer=blue, seller=orange, system=gray, human=black)
- [x] Click to expand raw message view
- [x] Concession chips display

### 4.4 Duel Arena (WOW Feature)
- [x] Create full-width dark arena panel (src/components/arena/duel-arena.tsx):
  - [x] LEFT: Seller agent panel (constraints, ask, min price, urgency)
  - [x] CENTER: Offer ladder (price cards stack) + "Ball in your court" indicator
  - [x] RIGHT: Buyer agent panel (max price, prefs, urgency)
- [x] Implement structured widgets:
  - [x] Current proposal card with score
  - [x] Concession chips
  - [x] Status message summary
  - [x] Next action indicator with glow effect
- [x] "Run Agent" button to trigger orchestration step
- [x] Agreement detection and deal state
- [x] Arena listing page (src/app/arena/page.tsx)
- [x] Arena detail page (src/app/arena/[id]/page.tsx)

### 4.5 Human Input Flow
- [x] Create user prompt card (src/components/arena/human-input.tsx)
- [x] Handle choices (radio buttons) and free-text responses
- [x] POST /api/orchestrate/human-response endpoint
- [x] Resume orchestration after human input

---

## MILESTONE 5: Escrow & Admin [DONE]
**Status: COMPLETE - 191 tests passing, build clean**

### 5.1 Escrow Contract Integration
- [x] Create escrow library with ethers (src/lib/escrow.ts):
  - [x] create(itemId, price, buyer) - seller calls
  - [x] deposit() - buyer calls
  - [x] confirm() - buyer calls
  - [x] flag() - buyer calls
  - [x] updatePrice(newPrice) - admin calls
  - [x] Mock implementations for demo mode
- [x] Create escrow API endpoint (src/app/api/escrow/route.ts)
- [x] Create escrow UI panel (src/components/escrow/escrow-panel.tsx)
- [x] Track escrow transactions in database
- [x] 23 unit tests for escrow flow

### 5.2 Admin Panel
- [x] Create /admin route (src/app/admin/page.tsx)
- [x] Admin wallet authorization check
- [x] Display flagged negotiations with details
- [x] Implement "Update Price" action with resolution
- [x] Dev mode fallback for testing

### 5.3 Events Feed
- [x] Create events API (src/app/api/events/route.ts)
- [x] All event types tracked:
  - listing_created, match_found, negotiation_started
  - buyer_proposes, seller_counters, deal_agreed
  - escrow_created, escrow_funded, delivery_confirmed
  - issue_flagged, issue_resolved
- [x] Home feed fetches real events from API
- [x] Fallback to demo events when empty

### 5.4 Seed Data & Dev Tools
- [x] Create seed endpoint: POST /api/dev/seed (DEV_MODE only)
- [x] DELETE /api/dev/seed to clear database
- [x] Generate 6 demo listings, 3 buy agents, events
- [x] Auto-creates sample match

---

## FINAL: Polish & Testing [DONE]
**Status: COMPLETE - 209 tests passing, build clean**

- [x] Run full test suite (209 tests passing)
- [x] Verify all environment variables documented
- [x] API endpoints gracefully handle missing database
- [x] All pages accessible (/sell, /buy, /arena, /admin, etc.)
- [x] Iron Man HUD-style Duel Arena with animations
- [x] Orchestrator tests with mocked AI outputs (48 tests)

---

## Environment Variables Required
```
DATABASE_URL=postgresql://user:pass@host:5432/ballpark
PRIVY_APP_ID=
PRIVY_APP_SECRET=
GEMINI_API_KEY=
GCS_BUCKET=
GCP_PROJECT=
GCP_SERVICE_ACCOUNT_JSON=
ESCROW_CONTRACT_ADDRESS=
ESCROW_ABI_JSON=
ADMIN_WALLET=
DEV_MODE=true
```

---

## Tech Stack Summary
- Next.js 14 (App Router)
- TypeScript
- TailwindCSS
- PostgreSQL (node-postgres/pg) - auto-migrations
- Privy (auth + embedded wallets)
- ethers (contract interaction)
- GCS (images via raw fetch, no SDK)
- Gemini API (AI agents)
- Server-Sent Events (realtime)
- Vitest (unit tests)

---

## Design Tokens
- **Font Headings**: Poppins Light
- **Font Body**: Inter
- **Colors**: Minimal white, black panels for arena/status
- **Style**: Polymarket-like, cards > chat bubbles, no gradients

---

## AUDIT (2026-02-08)

### Data Model Summary
The data model follows this relationship chain:
```
Listing (1) <-- (N) Match (1) --> (0..1) Negotiation (1) <-- (N) NegMessage
              \
               \--> BuyAgent (1) <-- (N) Match
```

- **Listing** can have many **Matches** (one per BuyAgent that finds it via Finder)
- Each **Match** can lead to 0 or 1 **Negotiation** (when user clicks "Negotiate", status becomes 'negotiating')
- Each **Negotiation** has many **NegMessages** (the turn-by-turn AI conversation)
- **SellAgent** is 1:1 with Listing (stores seller's negotiation preferences)
- **BuyAgent** can have many Matches across different Listings

### Event Types (Current)
| Event Type | Description |
|------------|-------------|
| listing_created | New listing published |
| match_found | Finder found a potential match |
| negotiation_started | User clicked "Negotiate" on a match |
| buyer_proposes | Buyer agent made an offer |
| seller_counters | Seller agent countered |
| human_input_required | Agent needs human decision |
| deal_agreed | Both sides agreed on price |
| escrow_created | Seller created escrow contract |
| escrow_funded | Buyer deposited funds |
| delivery_confirmed | Buyer confirmed receipt |
| issue_flagged | Buyer flagged an issue |
| issue_resolved | Admin resolved the issue |

### What Works
- Create listings (full wizard with AI analysis)
- Create buy agents (with filters and preferences)
- Run Finder to discover matches
- Basic negotiation flow with manual "Run Agent" button
- Duel Arena UI with HUD-style design
- SSE streaming for negotiation updates
- Escrow contract integration
- Admin panel for flagged issues

### What's Missing (Gap Analysis)

#### SELLER EXPERIENCE GAPS
1. **Listing page doesn't show negotiations** - Status rail shows "No active negotiations" even when negotiations exist
2. **No filtered feed on listing page** - Should show events only for this listing
3. **No prompt-type indicators** - Seller can't see what needs their input at a glance
4. **Can't browse negotiations from listing page** - Need to navigate to Arena separately

#### BUYER EXPERIENCE GAPS
1. **No auto-search on agent open** - Must manually click "Run Finder"
2. **Negotiate button doesn't create negotiation** - Only updates match status, no negotiation record
3. **No filtered feed for buyer's negotiation** - Should see events for their specific negotiation
4. **Buy agent state not tracked** - No "Active" state that runs automatically

#### CORE ORCHESTRATION GAPS
1. **Manual orchestration** - Requires clicking "Run Agent" button each turn
2. **No automatic turn progression** - Should auto-run when negotiation is created and after each response
3. **No "waiting for counterparty" indicator** - UI doesn't show live processing state
4. **No streaming to feed** - Status updates don't appear in real-time feed
5. **Current price not animated** - Static display instead of live updating

#### UNIFIED FEED GAPS
1. **Feed not reusable** - Home feed, listing feed, negotiation feed are not the same component
2. **No prompt filtering** - Can't filter to show only "needs input" events
3. **No hero thumbnail in feed** - Listing image not shown alongside events
4. **Events not linked to SSE** - New events don't stream in real-time

---

## MILESTONE 6: Unified Feed Component [DONE]
**Status: COMPLETE**
**Priority: HIGH**

### 6.1 Create Reusable EventFeed Component [DONE]
- [x] Extract feed logic into `src/components/feed/event-feed.tsx`
- [x] Support filter props: `listing_id`, `negotiation_id`, `user_id`, `types[]`
- [x] Add "prompt required" filter toggle (shows only human_input_required)
- [x] Include hero thumbnail support for listing-context events
- [x] Add SSE subscription for real-time updates

### 6.2 Integrate Feed Across Pages [DONE]
- [x] Replace Home page feed with EventFeed component
- [x] Add EventFeed to Listing detail page (filtered by listing_id)
- [x] Add EventFeed to Arena negotiation page (filtered by negotiation_id)
- [ ] Add compact EventFeed to Buy page sidebar (optional enhancement)

### 6.3 Event Enhancements [DONE]
- [x] Add new event type: `agent_processing`
- [x] Create events API SSE endpoint: GET /api/events/stream
- [x] Link events to negotiations for filtering
- [x] Add "whose turn" indicator in event cards (TurnBadge in negotiation events)

---

## MILESTONE 7: Automatic Orchestrator [DONE]
**Status: COMPLETE**
**Priority: HIGH**

### 7.1 Auto-Start on Negotiation Creation [DONE]
- [x] Modify POST /api/negotiations to trigger first buyer agent step
- [x] Add in-memory processing lock to prevent duplicate runs
- [x] Emit `negotiation_started` event with initial context

### 7.2 Auto-Continue After Each Turn [DONE]
- [x] After buyer agent responds, auto-trigger seller agent (1.5s delay)
- [x] After seller agent responds, auto-trigger buyer agent
- [x] Pause auto-run when `ball === 'human'`
- [x] Resume auto-run after human response submitted
- [x] Add configurable delay between turns (1.5s for dramatic effect)

### 7.3 Stream Status to Feed [DONE]
- [x] Emit events during orchestration: `agent_processing`, `buyer_proposes`, etc.
- [x] Connect orchestrator to SSE broadcaster via /api/events/stream
- [x] Update negotiation state in real-time via SSE polling
- [x] Show spinning indicator while agent is processing

### 7.4 Error Handling & Recovery
- [ ] Handle Gemini API failures gracefully
- [ ] Retry logic with exponential backoff
- [ ] Manual "Resume" button if auto-orchestration stalls
- [ ] Timeout detection (agent taking too long)

---

## MILESTONE 8: Enhanced Negotiation UX [DONE]
**Status: COMPLETE**
**Priority: MEDIUM**

### 8.1 Listing Page Negotiation View [DONE]
- [x] Query negotiations for the listing (all counterparties)
- [x] Show active negotiation summary cards
- [x] Add "View in Arena" link for each negotiation
- [x] Show pending prompts count badge
- [x] Display negotiation message count and last message

### 8.2 "Whose Turn" Indicators [DONE]
- [x] Add pulsing indicator for active side (buyer/seller)
- [x] "Waiting for Buyer..." / "Waiting for Seller..." text
- [x] TurnIndicator component with spinner animations
- [x] TurnBadge compact component for cards
- [x] Integrated into Arena page header and NegotiationCard

### 8.3 Price Animation [DONE]
- [x] Animate current price changes in Offer Ladder (AnimatedPrice component with eased counter)
- [x] Add price history sparkline chart (PriceSparkline SVG component with buyer/seller lines)
- [x] Show price delta badges (+$50 / -$25) (PriceDeltaBadge component)
- [x] Highlight when prices are converging (convergence indicator with gap %, glow effect)

### 8.4 Hero Thumbnail in Status Rail [DONE]
- [x] Show listing image in arena status rail header (HeroThumbnail component)
- [x] Quick listing info (title, category, ask price)
- [x] Link to full listing page

---

## MILESTONE 9: Buy Agent Auto-Search [PARTIAL]
**Status: 9.1-9.3 COMPLETE**
**Priority: MEDIUM**

### 9.1 Buy Agent Active State [DONE]
- [x] Add `status` field to buy_agents: 'active' | 'paused' | 'stopped' (migration 015)
- [x] BuyAgent type updated with BuyAgentStatus
- [x] Pause/Resume toggle in buy agent card (Play/Pause/Stop buttons)
- [x] StatusBadge component with active dot animation
- [x] PATCH /api/buy-agents endpoint for status updates
- [x] Stopped agents visually dimmed, auto-search skipped

### 9.2 Auto-Search on Open [DONE]
- [x] When selecting a buy agent in /buy page, auto-run finder (debounced 300ms)
- [x] Show "Auto-searching..." state with spinner
- [x] Debounce to prevent multiple simultaneous searches (timer + in-flight guard)
- [x] Cache results for 5 minutes to reduce API calls (CacheEntry with TTL)

### 9.3 Negotiate Button Creates Negotiation [DONE]
- [x] Fix handleNegotiate to call POST /api/negotiations
- [x] Navigate to /arena/[negotiation_id] after creation
- [x] Auto-start orchestration (triggers first buyer move)
- [x] Update match status to 'negotiating' atomically

---

## MILESTONE 10: Seller Dashboard [TODO]
**Status: NOT STARTED**
**Priority: LOW**

### 10.1 My Listings Page Enhancement
- [ ] Show negotiation count per listing
- [ ] Filter: active negotiations, needs input, completed
- [ ] Quick actions: view in arena, answer prompts

### 10.2 Seller Notifications
- [ ] Badge on sidebar when seller has pending prompts
- [ ] Email notifications for new negotiations (optional)
- [ ] Push notifications via web push API (optional)

---

## Implementation Order (Priority)

1. ~~**MILESTONE 7.1-7.2**: Auto-orchestration (core missing feature)~~ **DONE**
2. ~~**MILESTONE 9.3**: Negotiate button creates negotiation (broken flow)~~ **DONE**
3. ~~**MILESTONE 6.1-6.2**: Unified feed component (enables filtering)~~ **DONE**
4. ~~**MILESTONE 7.3**: Stream status to feed (real-time feel)~~ **DONE**
5. ~~**MILESTONE 8.1**: Listing page negotiation view~~ **DONE**
6. ~~**MILESTONE 8.2**: Whose turn indicators~~ **DONE**
7. **MILESTONE 9.1-9.2**: Buy agent auto-search
8. **MILESTONE 8.3-8.4**: Polish (price animation, thumbnails)
9. **MILESTONE 10**: Seller dashboard (nice to have)

---
