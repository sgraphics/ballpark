# Ballpark - Agentic Marketplace TODO

## IMPORTANT: Git Workflow (Required Until Bolt Build Issue Fixed)

**Why we commit to git:**
Bolt.new has a current build issue where the build process wipes the working directory. To preserve changes, ALL modifications MUST be committed and pushed to GitHub BEFORE running the build.

**GitHub Repository:**
- Origin: `https://github.com/sgraphics/ballpark`
- Branch: `main`

**GitHub PAT Token:**
```
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
```

**Workflow for ANY Change (MUST FOLLOW EXACTLY):**

1. **PULL FIRST** - Always pull latest changes before starting:
   ```bash
   git pull origin main
   ```

2. **Implement changes** - Make code changes and write/update tests

3. **Quality checks** - Verify code quality:
   ```bash
   npx tsc --noEmit  # Check TypeScript
   npm run lint       # Run linter (if configured)
   ```

4. **COMMIT** - Add and commit with scoped message:
   ```bash
   git add -A
   git commit -m "feat: description of changes"
   ```

5. **PUSH** - Push to GitHub using PAT:
   ```bash
   git push https://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@github.com/sgraphics/ballpark.git main
   ```

6. **Summary** - Provide brief summary of what was changed

7. **BUILD** - User or bolt.new will handle building - DO NOT run build commands

**CRITICAL RULES:**
- ❌ NEVER run `git init` - this wipes ALL commit history
- ❌ NEVER force push without pulling first
- ❌ NEVER reset or rebase - preserve all commit history
- ✅ ALWAYS pull before starting work
- ✅ DO NOT worry about building - that's handled separately

This workflow is confirmed with bolt.new helpdesk and is the official workaround until the build issue is resolved.

---

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

## MILESTONE 6: Production Integration [IN PROGRESS]
**Status: IN PROGRESS**

### 6.1 Database SSL Connection [DONE]
- [x] Fix pg driver SSL warning for `sslmode=require`
- [x] Strip sslmode from connection string and configure SSL manually
- [x] Add error event listener on pool for debugging
- [x] Add error logging to API routes

### 6.2 Privy Authentication Integration [DONE]
- [x] Add PrivyProvider wrapper to app layout
- [x] Create auth context with user session state (via useAuth hook)
- [x] Implement login/logout UI in header
- [x] Add `seller_user_id` / `buyer_user_id` population from Privy session
- [x] Protect routes that require authentication (ProtectedRoute component)
- [x] Add wallet connection for escrow transactions
- [x] Server-side auth verification with getUserIdFromRequest utility

### 6.3 Escrow Smart Contract [PENDING]
- [ ] Deploy escrow contract to testnet (Base Sepolia or similar)
- [ ] Configure `ESCROW_CONTRACT_ADDRESS` environment variable
- [ ] Configure `ESCROW_ABI_JSON` environment variable
- [ ] Test create escrow flow with real wallet
- [ ] Test deposit flow
- [ ] Test confirm delivery flow
- [ ] Test flag issue flow
- [ ] Connect escrow panel to real contract calls

### 6.4 Google Cloud Storage [PENDING]
- [ ] Create GCS bucket for image uploads
- [ ] Generate service account with Storage Object Creator role
- [ ] Configure `GCS_BUCKET`, `GCP_PROJECT`, `GCP_SERVICE_ACCOUNT_JSON` env vars
- [ ] Test signed URL generation for uploads
- [ ] Test signed URL generation for downloads
- [ ] Verify image upload flow in sell wizard

### 6.5 Gemini AI Integration [PENDING]
- [ ] Configure `GEMINI_API_KEY` environment variable
- [ ] Test image analysis with real Gemini API calls
- [ ] Test orchestrator buyer/seller prompts
- [ ] Tune prompts for negotiation quality
- [ ] Add rate limiting / error handling for API quota

---

## MILESTONE 7: Production Hardening [PENDING]
**Status: NOT STARTED**

### 7.1 Security
- [ ] Add CSRF protection
- [ ] Rate limit API endpoints
- [ ] Validate all user inputs server-side
- [ ] Add request logging / audit trail
- [ ] Review RLS policies if using Supabase

### 7.2 Error Handling
- [ ] Add global error boundary
- [ ] Improve API error responses with codes
- [ ] Add Sentry or similar error tracking
- [ ] Handle network failures gracefully in UI

### 7.3 Performance
- [ ] Add database indexes for common queries
- [ ] Implement pagination for listings/events
- [ ] Add image optimization / lazy loading
- [ ] Cache frequently accessed data

### 7.4 Testing
- [ ] Add integration tests for API routes
- [ ] Add E2E tests for critical flows
- [ ] Load test negotiation orchestrator
- [ ] Test concurrent escrow operations

---

## MILESTONE 8: Launch Readiness [PENDING]
**Status: NOT STARTED**

### 8.1 Deployment
- [ ] Set up production environment
- [ ] Configure production database
- [ ] Set up CI/CD pipeline
- [ ] Configure custom domain
- [ ] Set up SSL certificates

### 8.2 Monitoring
- [ ] Add health check endpoints
- [ ] Set up uptime monitoring
- [ ] Configure alerting for errors
- [ ] Add analytics tracking

### 8.3 Documentation
- [ ] Write API documentation
- [ ] Create user guide
- [ ] Document admin procedures
- [ ] Create runbook for common issues
