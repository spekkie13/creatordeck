# Spec: YouTube Live Integration (CreatorDeck)

**Status:** Draft — awaiting approval (Gate 0)
**Revision:** 2026-07-03 — §3.1 premise, §3.6 quota model, and broadcast-detection method corrected against current Google API docs (evidence: `research/youtube-chat-ingestion-landscape.md`)
**Workstream:** Worktree 1 of 2 (parallel with `spec-billing-entitlements.md`)
**Tier:** All YouTube functionality is **Pro-gated** (see billing spec for gate definitions)
**Author:** Spec drafted with Claude, to be reviewed by Claude Code against the actual repo before Gate 0 approval

---

## 1. Goal

Add YouTube Live as a second connected platform so a creator streaming to both Twitch and YouTube sees one unified live experience in CreatorDeck: combined chat feed, and YouTube monetization events (Super Chats / Super Stickers) flowing through the same event pipeline as Twitch events.

**User zero:** the owner, dogfooding on his own multi-platform streams during the current subathon. Success = a full real stream run with unified chat and at least one Super Chat event captured end to end.

## 2. Scope

### In scope (v1)
- Google OAuth connect/disconnect flow for a user's YouTube channel
- Encrypted storage of Google refresh tokens; access-token refresh handling
- Detection of the user's active live broadcast
- Live chat ingestion (read-only) into the existing event pipeline
- Super Chat / Super Sticker events parsed from the chat stream into the event feed (same shape/pipeline as Twitch bits/subs events)
- Unified chat view in the dashboard: Twitch + YouTube messages interleaved chronologically, platform-badged
- Quota instrumentation: log units consumed per session so real usage data exists before scaling

### Out of scope (v1) — explicit non-goals
- **Sending** chat messages to YouTube (requires `youtube.force-ssl` scope; widens Google verification burden — fast-follow)
- Channel Memberships (separate API access requirements + channel eligibility — parked)
- YouTube analytics/VOD data
- Triggers/macros reacting to YouTube events (works automatically if events enter the shared pipeline with a common shape, but no YT-specific trigger UI in v1)
- Multi-channel support per user (one YouTube channel per account in v1)

## 3. Architecture

### 3.1 Constraint that shapes everything: Vercel is serverless
YouTube offers **two official ways** to consume live chat (verified against Google docs 2026-07-03; citations in `research/youtube-chat-ingestion-landscape.md`):
- **`liveChatMessages.list`** — request/response polling; each response carries `nextPageToken` + `pollingIntervalMillis` (the wait YouTube demands before the next call).
- **`liveChatMessages.streamList`** — a generally-available **server-streaming** method (gRPC/HTTP2; in Google's generated clients since Oct 2024, guidance expanded Jul 2025) that pushes messages over a long-lived connection and resumes after disconnect via `pageToken`. Google's own `list` docs now recommend it *over* polling to save quota. Its long-lived-connection shape fits a stateless request/response route poorly — but this repo already holds SSE connections on Vercel with `maxDuration = 300`, so bounded streaming windows with resume-on-reconnect are viable in our hosting.

An *indefinitely* persistent server-side ingester still cannot live in a single Vercel invocation.

**Fixed decision: client-driven ingestion through our API, tokens server-side only.**
- The dashboard (already open in the browser during streams — established usage pattern) drives the ingestion lifecycle: nothing consumes YouTube API while no tab is open.
- Google tokens never reach the browser; the browser only drives timing/liveness.

**Gate 1 decision — server-side source mode (spike both, choose with measurements):**
- *Mode A — stateless polling:* each client tick calls `GET /api/youtube/chat` (Next.js route). The route: (1) loads the user's tokens (refreshing if expired), (2) calls `liveChatMessages.list` with the stored `nextPageToken`, (3) returns new messages + `nextPageToken` + `pollingIntervalMillis`. The client schedules the next tick using the returned `pollingIntervalMillis` (never a hardcoded interval — YouTube adjusts it by chat velocity).
- *Mode B — streaming relay:* the client holds an SSE connection to a `maxDuration`-bounded route that consumes `streamList` and relays messages; on route expiry/disconnect the client reconnects and the route resumes from the persisted `pageToken` (same session-state persistence either way).
- Decision inputs: measured units/hour of each mode (`list` cost is unpublished — §3.6), delivery latency, and implementation complexity. Default to Mode A if measurements don't clearly favor Mode B.

**Rejected alternatives (documented for the review):**
- *Server-side worker (Railway/VPS/cron):* new infra to run and pay for; overkill pre-validation. Note: `streamList` (~1 unit per connection, community-measured) makes a persistent worker dramatically cheaper quota-wise than assumed when this was first rejected — revisit if headless operation (dashboard closed) becomes a real need.
- *Desktop app (C# companion) as poller:* couples a Pro web feature to desktop app installation; keeps tokens on-device or requires token hand-off. Rejected for v1.
- *Client polls YouTube directly:* requires exposing access tokens to the browser. Rejected.
- *Embedding the popout chat page (`live_chat?is_popout=1`) for display:* zero-quota, and exactly how OBS Studio and Streamlabs Desktop render chat — but events never enter our pipeline/history, and DOM structure is as fragile as any scraper. Rejected: CreatorDeck needs capture, not just display.

**Accepted limitation (v1):** YouTube ingestion only runs while a dashboard tab is open. Acceptable because the dashboard-open-while-live pattern is the product's core usage model. Document this in the UI ("YouTube chat is live while CreatorDeck is open").

### 3.2 Event pipeline integration
- YouTube chat messages and monetization events are normalized into the **existing event shape** used by Twitch events (extend with `platform: 'twitch' | 'youtube'` discriminator).
- Persisted to the existing events table(s) in Neon via Prisma, same as Twitch events, so history/retention rules (30-day Free cap / unlimited Pro — see billing spec) apply uniformly.
- Delivered to the dashboard through the existing `useStreamEvents` SSE/live mechanism where possible; if the SSE source is Twitch-specific, the client polling loop may feed YouTube messages into the same client-side store directly (implementation detail — Claude Code to decide against actual repo structure at Gate 1).

### 3.3 Data model (Prisma — names indicative, align with repo conventions)
```
model YouTubeConnection {
  id             String   @id @default(cuid())
  userId         String   @unique
  channelId      String
  channelTitle   String
  refreshToken   String   // encrypted at rest (see 3.4)
  accessToken    String?  // encrypted; short-lived cache
  tokenExpiresAt DateTime?
  scopes         String
  connectedAt    DateTime @default(now())
  updatedAt      DateTime @updatedAt
}
```
- Event rows: add `platform` discriminator + a `raw`/`details` JSON column if not already present (Super Chat amount, currency, tier live here).

### 3.4 Token security
- Refresh tokens encrypted at rest (AES-256-GCM with a key from env / Vercel secret) — not plaintext columns.
- Disconnect flow must **revoke** the token with Google (`https://oauth2.googleapis.com/revoke`), then delete the row.
- Never log tokens; scrub from error reporting.

### 3.5 Google Cloud / OAuth specifics
- **Scope (v1): `youtube.readonly` only.** Minimal scope = simpler Google verification. `force-ssl` (chat send) deferred deliberately.
- OAuth consent screen: External. Unverified apps are limited to a test-user allowlist (~100) — fine for early access, but **Google's sensitive-scope verification takes weeks and must be started in week 1**, requiring: verified domain (creatordeck.itsspekkie.com), privacy policy URL, homepage, scope justification, and possibly a demo video.
- Redirect URIs for local dev, preview, and production configured up front.

### 3.6 Quota budget (design constraint, not an afterthought)
Facts verified 2026-07-03 (citations in `research/youtube-chat-ingestion-landscape.md`):
- Default allocation: **10,000 units/day combined**, plus hard caps of **100 `search.list` calls/day** (100 units each) and 100 `videos.insert` calls/day. Quota is **per project** — OAuth'd requests draw from our shared pool; per-user quota relief does not exist. More quota = free audited-increase request, realistically granted at modest scale after shipping within 10k and applying with real usage data (the documented Nightbot / Streamer.bot path).
- **`liveChatMessages.list` per-call cost is unpublished by Google** (the quota calculator omits all live methods; community figures have ranged 1–5 units). It must be **measured, not assumed**: at a ~5 s median interval that's ~720 calls per stream-hour — anywhere from ~7% to ~36% of the daily quota per stream-hour depending on the true cost.
- **`streamList` is community-measured at ~1 unit per connection** — under Mode B (§3.1), chat ingestion becomes near-free and quota pressure shifts entirely to broadcast detection.
- **Broadcast detection is the realistic quota trap, not chat:** `search.list` is forbidden for "am I live?" logic (100 units per call, 100/day hard cap). Use **`liveBroadcasts.list` with `mine=true`** (1-unit class, uses the OAuth grant we already hold).
- Mitigations to build in from the start:
    - Ingest **only** while a live broadcast is confirmed active; broadcast-detection checks are infrequent (manual "go live" button in v1 + a slow background check via `liveBroadcasts.list`), never a fast loop.
    - In Mode A, respect `pollingIntervalMillis` exactly; back off on quota errors (HTTP 403 `quotaExceeded`) with a visible UI state, never a retry storm.
    - Log units/session (instrumentation is in scope) → file the quota-increase request with real numbers before opening to more users.
- **v1 posture:** quota is sized for user zero + a handful of early Pros. Quota increase request is a launch-phase task, informed by dogfooding data.

## 4. UX summary
- **Connections page:** "Connect YouTube" alongside the existing Twitch connection; shows channel name/avatar when connected; disconnect with confirmation (mentions revocation).
- **Dashboard:** unified chat feed with platform badges; Super Chats styled as highlighted events (consistent with how bits/subs render); "YouTube: live / not live / quota-limited / disconnected" status chip.
- **Gating:** the Connect YouTube button itself is behind `hasPro` (see billing spec) — free users see it locked with a preview, per the visible-but-locked pattern.

## 5. Acceptance criteria
1. User can connect a YouTube channel via OAuth; tokens stored encrypted; reconnect and disconnect (with revocation) both work.
2. With a live YouTube broadcast active, chat messages appear in the unified feed within one polling interval, correctly interleaved with Twitch chat.
3. A Super Chat sent on YouTube appears as a monetization event in the event feed with amount + currency, and persists to history.
4. Ingestion starts/stops correctly with broadcast state and dashboard tab lifecycle; zero YouTube API consumption occurs when no broadcast is live.
5. Quota exhaustion degrades gracefully: visible status, no crash, no retry storm.
6. All YouTube features are inaccessible (locked UI) for non-Pro users, verified with a free test account.
7. Token refresh works across a stream longer than access-token lifetime (~1h) without user interaction.
8. **Dogfood gate:** one full real multi-platform stream by user zero with unified chat + at least one captured Super Chat event, and a screen recording of it (double-duty: Polar review material).

## 6. Phases & gates (per spec-first methodology)
- **Gate 0 — Spec approval:** this document reviewed by Claude Code against the repo (naming, event shape, SSE mechanism, auth library actually in use) and approved by owner. *No code before this gate.*
- **Phase 1 — Foundation:** Google Cloud project, consent screen, OAuth flow, token storage/refresh, Connections UI. Start Google verification process immediately. Includes the §3.1 ingestion-mode spike (Mode A vs B) with measured units/hour. **Gate 1:** connect/disconnect works in dev; verification submitted; ingestion mode chosen with measurements.
- **Phase 2 — Ingestion:** broadcast detection (`liveBroadcasts.list mine=true` — never `search.list`), chat ingestion route + client loop per the Gate 1 mode decision, event normalization + persistence, unified feed UI. **Gate 2:** acceptance criteria 2–5 pass against a real test broadcast.
- **Phase 3 — Hardening & dogfood:** quota instrumentation, error states, Pro gating wired (depends on billing spec Phase 2), full dogfood stream. **Gate 3:** criterion 8 passes → feature is review- and launch-ready.

## 7. Risks & open questions
| Risk | Impact | Mitigation |
|---|---|---|
| Google sensitive-scope verification takes weeks | Blocks opening to non-allowlisted users (not the owner) | Start week 1; allowlist covers early access meanwhile |
| Quota insufficient for >1 concurrent streamer | Caps Pro user count | Instrument, then request increase with data |
| Dashboard-closed = no ingestion | Feature perceived as flaky if misunderstood | Explicit UI copy; revisit worker architecture post-validation |
| `useStreamEvents`/SSE is Twitch-coupled | Rework in pipeline integration | Gate 0 repo review resolves before code |
| `list` per-call cost unpublished by Google | Quota envelope unknowable up front | Measure both modes in the Gate 1 spike; units/session instrumentation from day one |
| Mode B: `streamList` long-lived connections vs Vercel function limits | Reconnect seams / missed messages at window boundaries | `maxDuration`-bounded windows + resume via persisted `pageToken`; fall back to Mode A |

**Open for Gate 0 review (Claude Code):** actual auth library (NextAuth?) and how a second OAuth provider hangs off it; exact event table shape; whether SSE source can carry YouTube events or client-store injection is cleaner; encryption utility availability in repo.
