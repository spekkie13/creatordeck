# Plan: YouTube Live Integration (spec: `specs/YouTube-Chat-Connect.md`)

**Prepared for Gate 0.** Planning only — no code changed. **Reconciled 2026-07-03 with the spec's same-day revision** (spec header Revision line: §3.1 now fixes only the client-driven principle and defers the server-side source mode to a Gate 1 spike; §3.6 rewritten with verified quota facts; acceptance criterion 4 reworded; two new §7 risk rows) and its evidence base `research/youtube-chat-ingestion-landscape.md` (TL;DR, §1.1, §4). Sibling workstream: `specs/Billing-Entitlements.md` (this plan *consumes* `hasPro`/`requirePro` from billing Phase 1–2; it does not design entitlements).

---

## 1. Spec vs. Repo findings

The repo is significantly further along than the spec assumes — and partly along a *different* (scraper-based) path that the spec explicitly supersedes. Findings, in spec order:

### 1.1 ORM: Drizzle on Neon, not Prisma
- Spec §3.3 writes the data model as Prisma. The repo uses **Drizzle ORM 0.45** with `@neondatabase/serverless` (`src/lib/db.ts`, `src/lib/schema.ts`), config in `drizzle.config.ts` / `drizzle.config.prod.ts`, output dir `drizzle/` (currently one squashed migration, `0000_abandoned_sprite.sql`).
- Convention: **edit `src/lib/schema.ts` → `npm run db:generate` (emits `drizzle/000N_*.sql` + snapshot) → `npm run db:push:all`** (pushes to both test and prod DBs). All schema work below is expressed this way.
- The spec's `YouTubeConnection` model **should not be created**. The repo already has a generic `linked_accounts` table (one row per `(provider, providerAccountId)`, providers: `twitch`, `youtube`, `spotify`) holding `accessToken`/`refreshToken` (currently **plaintext**), `login`, `displayName`. The spec model maps onto it: `channelId` → `providerAccountId`, `channelTitle` → `displayName`, `connectedAt` → `createdAt`. Missing vs. spec: `tokenExpiresAt`, `scopes`, encryption → added by migration (Phase 1).

### 1.2 Router: App Router
- Next 16, **App Router** (`src/app/**/route.ts`). The spec's `GET /api/youtube/chat` fits repo convention as `src/app/api/youtube/chat/route.ts` (sibling to existing `api/twitch/*`, `api/spotify/*`). The current YouTube route lives at `api/events/youtube-chat` and is scraper-based (teardown, §2).

### 1.3 Auth: next-auth 4.24 — Gate 0 question answered
Two Google OAuth paths already exist:
1. **`GoogleProvider` inside `authOptions`** (`src/lib/auth.ts`) — used for *login* ("Continue with YouTube", `src/app/sign-in-button.tsx`). It requests **`youtube.force-ssl`** — a direct violation of spec §3.5 (readonly only), and a heavier Google-verification burden.
2. **A standalone PKCE connect flow** at `src/app/api/connections/link/google/start/route.ts` + `.../callback/route.ts` → `connectionsService.linkGoogleAccount()`. It already requests **`youtube.readonly`**, uses `state` + PKCE via an httpOnly cookie, exchanges the code server-side, resolves the channel via `channels.list(mine=true)`, and upserts `linked_accounts`. Tokens never reach the browser.

**Decision (Gate 0):** the **standalone connect flow is canonical** for YouTube connection — it already matches the spec's architecture and mirrors how Spotify is linked. It stays a separate OAuth flow, *not* a next-auth provider callback. The next-auth `GoogleProvider` remains only as a *login identity* method, and its scope is **reduced from `youtube.force-ssl` to `youtube.readonly`** so the app requests exactly one sensitive scope everywhere (a lesser scope like `openid email profile` alone won't work for login today because the login flow keys the account by YouTube `channelId` via `channels.list`). Twitch connection, by contrast, is wired *through* next-auth login — YouTube deliberately does not follow that pattern.

### 1.4 Event pipeline — Gate 0 questions answered
- There is **no single events table**. Events are per-type tables: `sub_events`, `follow_events`, `cheer_events`, `raid_events`, and YouTube-specific **`yt_superchat_events`** (with first-class `amount_micros bigint` + `currency text` — *better* than the spec's suggested `raw`/`details` JSON column, which is therefore **not needed**) and `yt_member_events`.
- The `platform: 'twitch' | 'youtube'` discriminator the spec asks for **already exists** at the normalization layer: `LiveEvent` (`src/types/events.ts`) carries `platform`, set by mappers in `src/lib/event-mappers.ts` (`mapSuperchatToEvent`, `mapMemberToEvent` already exist). `chat_messages` (unified chat persistence table) also already has a `platform` column.
- **`useStreamEvents` is NOT Twitch-coupled.** `/api/events/stream` DB-polls `liveEventFeedService.getEventsSince(broadcasterId, since, youtubeChannelId)`, which already merges `yt_superchat_events`/`yt_member_events`. **Conclusion: persistence-driven delivery wins** — once the new polling route persists Super Chat rows, they flow to the dashboard event feed (and the OBS widget stream at `api/widget/events/stream`) with zero pipeline changes. For *chat messages*, client-store injection is already the established model (`useYouTubeChat` + `useTwitchChat` merged client-side in `src/app/live/live-client.tsx`) and stays.
- **No encryption utility exists** anywhere in `src/lib` (only `randomBytes` usage). An AES-256-GCM helper must be added (§3.4) — Phase 1.

### 1.5 Existing YouTube implementation contradicts the spec's architecture
- The repo depends on **`youtube-chat` 2.2.0** (unofficial InnerTube scraper, no OAuth, no quota, brittle string-parsing of Super Chat amounts and membership badges; per research §1.2 it is **abandonware** — dead since 2022-12 with an open 2024 page-regex breakage issue) driven by an SSE route that holds a long-lived listener inside a Vercel function (`maxDuration = 300`). The deleted `specs/IDEA-7-youtube-chat-live-listener.md` (recoverable via `git show HEAD~…`) documents this approach. The revised spec §3.1 fixes the official-API + client-driven principle and defers the server-side *source mode* to a Gate 1 spike — but the scraper **data source** is disqualified under either mode, so **all scraper-path code is Phase 0 teardown** (full inventory in §2).
- Nuance the revision adds: the torn-down route's *transport shape* — client-held SSE into a `maxDuration`-bounded Vercel function with resume-on-reconnect — is exactly the **Mode B template** (spec §3.1), with the data source swapped from the InnerTube scraper to the official `liveChatMessages.streamList` (GA server-streaming method; research §1.1). The teardown deletes the scraper source, not the lesson of the transport.
- The `ws` + `@types/ws` packages are **imported nowhere in `src/`** (Twitch chat uses the browser-native `WebSocket`; `youtube-chat` depends on axios). They appear to be leftovers → removed in teardown.

### 1.6 Non-goal violations already in the repo (spec §2)
- **Memberships are implemented** (scraper-parsed): `yt_member_events` table + repository, `mapMemberToEvent`, `member` LiveEvent type, `youtube_member` goal type, YT-member goal UI on dashboard/live/goals pages. The spec parks memberships for v1. Plan: the *writer* dies with the scraper; tables, mappers, and read-side UI stay **untouched** (historical rows keep rendering). Whether to re-ingest memberships from the official API is flagged as an owner question (§4 Q1) because they arrive in the same `liveChatMessages` responses (either mode) at zero extra quota — but per spec, v1 builds **no** member parsing.
- Chat send: not implemented anywhere (good). Multi-channel: schema is one-YouTube-row-per-user via linking flow (good).

### 1.7 Assorted smaller mismatches
- **Disconnect does not revoke** (`src/app/api/connections/disconnect/route.ts` just deletes the row) — violates §3.4. Fixed in Phase 1.
- **No quota instrumentation** exists (§3.6). `vercel.json` is `{}` — no crons; `env.cronSecret` is currently unused by any route.
- `yt_stream_sessions` table already exists with exactly the state the new stateless route needs (`live_chat_id`, `chat_page_token`, `started_at`/`ended_at`) — the schema anticipated the official-API design even though no code writes to it today (`ytStreamSessionsRepository` only has `isActive()`, read by connections + dashboard pages). **Refactored, not rebuilt** (Phase 2).
- Spec §4 mentions channel **avatar** on the Connections page; the repo shows name/ID only and stores no thumbnail URL. Resolved at Gate 0 (§4 D4): avatar ships in v1 — the connect flow's existing `channels.list` response already carries `snippet.thumbnails`, so it costs one `avatar_url` column + one mapped field.
- Billing: the repo's current tier system (`users.tier` free/tier1-3, `src/lib/gates.ts` `GATES`/`hasAccess`, Lemon Squeezy) is being replaced by the billing workstream's Polar-based `hasPro`/`requirePro`. This plan gates YouTube routes/UI on **`requirePro`/`hasPro` as delivered by billing Phase 1–2** and adds YouTube rows to that spec's gate inventory (§3.5 there); it builds no entitlement logic itself.

### 1.8 Spec revision 2026-07-03 — what changed and how this plan absorbs it
The spec's original "YouTube chat is poll-only" premise was proven outdated by `research/youtube-chat-ingestion-landscape.md` (§1.1: `liveChatMessages.streamList` is a GA server-streaming method that Google's own docs now recommend over `list` polling). Consequences taken into this plan:
- **§3.1 revised:** only *client-driven ingestion, tokens server-side* is fixed. The server-side source mode is a **Gate 1 spike decision** between **Mode A** (stateless `GET /api/youtube/chat` polling `liveChatMessages.list`, honoring `pollingIntervalMillis`) and **Mode B** (client-held SSE to a `maxDuration`-bounded route consuming `streamList`, resuming from a persisted `pageToken`). Default is Mode A absent a clear measured win for B. → Phase 1 gains the spike; Phase 2's ingestion route + client hook are mode-conditional. Either way, `yt_stream_sessions.live_chat_id` + `chat_page_token` are the persisted resume state.
- **§3.6 rewritten with verified facts:** `liveChatMessages.list` per-call cost is **unpublished by Google** (community range 1–5 units) — instrumentation must *measure*, never assume; `streamList` is community-measured at ~1 unit/connection; **`search.list` is hard-capped at 100 calls/day (100 units each) and forbidden for broadcast detection** — detection must use `liveBroadcasts.list mine=true` (1-unit class). This plan's `/api/youtube/broadcast` design already used `liveBroadcasts.list` and now pins it explicitly; nothing in this plan — including the slow background liveness check — touches `search.list`.
- **AC4 reworded** to "Ingestion starts/stops correctly with broadcast state and dashboard tab lifecycle; **zero YouTube API consumption** occurs when no broadcast is live" — verification table and Gate 2 checks updated, mode-neutrally.
- **Two new §7 risk rows** (unpublished `list` cost; Mode B reconnect seams) — mapped to phases in the risk table at the end of §3.

---

## 2. Teardown inventory (Phase 0 scope)

Everything in the repo that currently attempts YouTube functionality, with disposition **(a) removed / (b) refactored / (c) untouched**:

| # | Path | What it does today | Disposition |
|---|---|---|---|
| 1 | `package.json` → `youtube-chat` 2.2.0 | Unofficial live-chat scraper | **(a)** remove dependency |
| 2 | `package.json` → `ws` 8.19.0, `@types/ws` | Imported nowhere in `src/` (Twitch chat hook uses browser `WebSocket`) | **(a)** remove both |
| 3 | `src/app/api/events/youtube-chat/route.ts` | SSE route; spins up a `LiveChat` scraper per connection, `maxDuration=300`, persists chat/superchat/member rows, replays via `Last-Event-ID` | **(a)** delete; the scraper *source* is dead under either ingestion mode. Superseded by the Gate-1-chosen route (Phase 2). Note: its client-held-SSE + bounded-`maxDuration` + resume-on-reconnect **transport is the Mode B template** with the source swapped to official `streamList` |
| 4 | `src/lib/youtube-chat-mapper.ts` | Maps scraper `ChatItem` → inserts/SSE payloads; best-effort currency-symbol and membership-badge string parsing | **(a)** delete; official API returns structured `amountMicros`/`currency` — new `src/lib/youtube-api-mapper.ts` replaces it |
| 5 | `src/hooks/use-youtube-chat.ts` | Opens `EventSource("/api/events/youtube-chat")`, feeds `ChatMessage[]` into the unified chat store | **(b)** rewrite per the Gate 1 mode decision (Mode A: polling loop honoring `pollingIntervalMillis`; Mode B: `EventSource` reconnect loop — the hook's current EventSource shape is already the Mode B client template); same return contract so `live-client.tsx` barely changes |
| 6 | `src/lib/auth.ts` — `GoogleProvider` + google branch of `jwt` callback | Google *login*; requests **`youtube.force-ssl`**; upserts `linked_accounts` keyed by channelId | **(b)** keep login, drop scope to `youtube.readonly`; token persistence from this path routes through the same encrypted-write helper as the connect flow |
| 7 | `src/app/api/connections/link/google/start/route.ts` + `callback/route.ts` | Standalone PKCE connect flow, already `youtube.readonly` | **(b)** keep as canonical connect flow; callback gains expiry/scopes persistence + encryption |
| 8 | `src/services/connections.service.ts` → `linkGoogleAccount()` | Code exchange, channel lookup, plaintext token upsert | **(b)** store `expires_in`→`tokenExpiresAt`, granted `scope`, encrypted tokens |
| 9 | `src/app/api/connections/disconnect/route.ts` | Deletes `linked_accounts` row; **no Google revocation** | **(b)** add revoke call for provider `youtube` before delete (§3.4) |
| 10 | `src/services/youtube.service.ts` | `fetchYouTubeSubCount` (dashboard stat) + `refreshYouTubeToken` (plaintext, no expiry cache) | **(b)** becomes the official-API service: token refresh w/ encryption + expiry, broadcast detection (`liveBroadcasts.list mine=true` only), chat ingestion per the Gate 1 mode (`liveChatMessages.list` or `streamList`), revocation; sub-count fetch preserved |
| 11 | `src/lib/schema.ts` → `yt_stream_sessions` + `src/repositories/yt-stream-sessions.repository.ts` | Poll-session state table (`live_chat_id`, `chat_page_token`); only `isActive()` is used (connections + dashboard "poller active" chips) | **(b)** becomes the ingestion-session state store; `live_chat_id` + `chat_page_token` are the **resume state in both modes** (Mode A: `nextPageToken` between stateless polls; Mode B: resume-after-reconnect `pageToken`); repo gains open/close/advance/instrumentation methods |
| 12 | `src/app/connections/youtube-connect.tsx`, `youtube-manage.tsx`, `connections/page.tsx` YouTube row | Connect button → link flow; "Live chat poller Active/Inactive" chip from `ytStreamSessions.isActive` | **(b)** copy updated ("YouTube chat is live while CreatorDeck is open"), status semantics tied to new session lifecycle, Pro-locked state (Phase 3) |
| 13 | `src/lib/schema.ts` → `linked_accounts` | Stores Google tokens **plaintext**, no expiry/scopes | **(b)** migration: add `token_expires_at`, `scopes`; encrypt token values |
| 14 | `src/app/sign-in-button.tsx` ("Continue with YouTube"), `src/app/setup/setup-wizard.tsx` step 3, `src/app/login` | Google login + onboarding connect step | **(c)** untouched (login scope change happens in item 6) |
| 15 | `chat_messages` table + `src/repositories/chat-messages.repository.ts` | Unified chat persistence, `platform` column, `event_id` dedup, `onConflictDoNothing` | **(c)** untouched — new route writes to it |
| 16 | `yt_superchat_events` table + repository, `mapSuperchatToEvent`, `superchat` LiveEvent type + styling (`src/lib/event-types.ts`) | Super Chat persistence + normalization (micros + ISO currency) | **(c)** untouched — new route writes to it |
| 17 | `yt_member_events` table + repository, `mapMemberToEvent`, member goal UI (dashboard/goals/live) | Membership events/goals | **(c)** untouched; **writer removed with scraper; no v1 replacement** (spec non-goal; see §4 Q1) |
| 18 | `/api/events/stream`, `/api/widget/events/stream`, `liveEventFeedService`, `useStreamEvents` | DB-poll SSE already merging YouTube events per `session.youtubeChannelId` | **(c)** untouched |
| 19 | `src/app/live/live-client.tsx` unified chat UI, platform badges/logos | Interleaves Twitch + YouTube messages chronologically | **(c)** untouched apart from the new YouTube status chip (Phase 2) |
| 20 | Dashboard (`src/app/dashboard/page.tsx` + client) — YT sub count, member goal, platform status | Reads via service/repos | **(c)** untouched (sub-count call site unchanged; service internals refactored in item 10) |
| 21 | `session.youtubeChannelId` plumbing (`next-auth.d.ts`, session callback, many pages) | Identity of connected channel | **(c)** untouched |

**Phase 0 exit criterion:** `youtube-chat`, `ws`, `@types/ws` gone from `package.json`; items 3–4 deleted; item 5 stubbed to return an empty `ChatMessage[]` so the app builds and Twitch-only flows are unaffected; `npm run build` green. Nothing new is built on the scraper path.

---

## 3. Phased implementation plan

### Phase 0 — Teardown (prerequisite, small)
1. `npm uninstall youtube-chat ws @types/ws` (verify `npm run build` — no other importer exists).
2. Delete `src/app/api/events/youtube-chat/route.ts` and `src/lib/youtube-chat-mapper.ts`.
3. Reduce `src/hooks/use-youtube-chat.ts` to an inert stub keeping its `ChatMessage[]` contract (live view compiles; YouTube chat simply empty until Phase 2).
4. In `src/lib/auth.ts`, change GoogleProvider scope to `openid email profile https://www.googleapis.com/auth/youtube.readonly`.
5. Verify: build passes; `/live` works Twitch-only; connections page still renders the YouTube row.

### Phase 1 — Foundation (spec Phase 1; Gate 1)
**Google Cloud (owner tasks, week 1):** consent screen (External), test-user allowlist, redirect URIs for local (`http://localhost:3000/api/connections/link/google/callback`), preview, and prod (`https://creatordeck.itsspekkie.com/...`); **start `youtube.readonly` sensitive-scope verification immediately** (privacy policy URL, homepage, scope justification, demo video).

**Repo changes:**
1. **Encryption utility** — new `src/lib/token-crypto.ts`: AES-256-GCM, key from new env `TOKEN_ENCRYPTION_KEY` (32-byte base64; add to `src/lib/env.ts` via `requireEnv`, Vercel secret + `.env.local`). Ciphertext format `enc:v1:<iv>:<tag>:<ciphertext>` (base64url) so plaintext legacy rows are detectable (`isEncrypted()`) and decryption is versioned. Unit-testable pure functions; never logs inputs.
2. **Drizzle migration #1** — in `src/lib/schema.ts`, extend `linkedAccounts`: `tokenExpiresAt: timestamp("token_expires_at")`, `scopes: text("scopes")`, `avatarUrl: text("avatar_url")` (Gate 0 decision §4 D4). Run `npm run db:generate` → `drizzle/0001_*.sql`, then `npm run db:push:all`. (Token encryption is a value-format change, not a schema change — the `text` columns stay.)
3. **Encrypted token I/O** — `linkedAccountsRepository`: encrypt on write (`upsertForUser`, `upsertWithUser`, `updateAccessToken` — extend the latter to also set `tokenExpiresAt`), decrypt on read via a narrow accessor (e.g. `getDecryptedTokens(userId, provider)`), so raw rows returned to pages never carry usable plaintext. Applies to all providers going forward (Twitch/Spotify writes get encrypted on next refresh — cheap, format-prefix makes it incremental; see §4 Q3). Never log token values; scrub from thrown errors.
4. **Connect flow completion** — `connectionsService.linkGoogleAccount()`: persist `tokenExpiresAt` (`now + expires_in`), granted `scope` string, and channel thumbnail (`snippet.thumbnails.default.url` from the `channels.list` response already in hand) → `avatarUrl`; keep PKCE/state as-is (already solid).
5. **Token refresh helper** — in `src/services/youtube.service.ts`: `getValidAccessToken(userId)` → decrypt; if `tokenExpiresAt` within 60 s, POST `oauth2.googleapis.com/token` (grant `refresh_token`), persist new encrypted access token + expiry; on `invalid_grant` mark the connection broken (surfaces as "reconnect" state in UI). Replaces the current refresh-on-401 plaintext path; `fetchYouTubeSubCount` call site in `dashboard/page.tsx` switches to it.
6. **Disconnect with revocation** — `disconnect/route.ts`: for provider `youtube`, POST refresh token (fallback access token) to `https://oauth2.googleapis.com/revoke` (best-effort — proceed with row delete on failure, log without token), then delete. Confirmation dialog copy in `DisconnectButton`/connections page mentions revocation (§4 UX).
7. **Connections UI** — keep Connect/Manage components; show channel avatar (`avatarUrl`) beside the name (spec §4); update manage copy from "Live chat poller" to broadcast-status language; add reconnect state for broken tokens.
8. **Ingestion-mode spike (spec §3.1 Gate 1 decision — new in the 2026-07-03 revision).** Throwaway harness (scratch script or an `isAdmin`-gated dev route à la the existing `/api/dev/*`; not shipped), run against the owner's connected channel on the dev Google project, exercising **both modes over comparable live-session windows**:
   - *Mode A — stateless polling:* `liveChatMessages.list` loop honoring the returned `pollingIntervalMillis`.
   - *Mode B — streaming relay:* consume `liveChatMessages.streamList` (server-streaming; part of assessing B is verifying what the Node ecosystem actually supports today — generated `googleapis` client vs. raw HTTP/2/gRPC — this feeds the complexity score) inside a `maxDuration`-bounded window; deliberately kill the window mid-stream and resume from the `yt_stream_sessions.chat_page_token` persisted `pageToken` to prove the **reconnect seam** (overlap absorbed by `event_id` + `onConflictDoNothing` dedup; gaps = disqualifying).
   - Measure per mode: **units/hour** read from the Google Cloud console per-method quota metrics — the only reliable source, since `list`'s per-call cost is unpublished (community range 1–5 units) and `streamList` is community-measured at ~1 unit/connection; **delivery latency**; **implementation complexity** in this codebase.
   - **Decision rule (per spec): default Mode A unless measurements clearly favor Mode B.** Output: a short decision note appended to this plan, resolving Phase 2's mode-conditional items.

**Gate 1 verification (acceptance criterion 1 + 7 groundwork, plus the spec's revised Gate 1):** connect on dev → row with `enc:v1:` tokens, expiry, scopes; DB inspection shows no plaintext; reconnect updates the row; disconnect revokes (verify at Google account permissions page) and deletes; Google verification submitted; **ingestion mode chosen, with the measured units/hour, latency, and complexity numbers recorded**.

### Phase 2 — Ingestion (spec Phase 2; Gate 2)
1. **Drizzle migration #2** — extend `ytStreamSessions` in `src/lib/schema.ts` for ingestion-session state + instrumentation (mode-independent — this table is the resume state in **both** modes): `pollCount: integer("poll_count").notNull().default(0)`, `quotaUnits: integer("quota_units").notNull().default(0)`, `lastPolledAt: timestamp("last_polled_at")`. (`live_chat_id`, `chat_page_token`, `started_at`, `ended_at` already exist.) `npm run db:generate` → `drizzle/0002_*.sql` → `db:push:all`. Extend `ytStreamSessionsRepository`: `findActive`, `open`, `close`, `advance(pageToken, msgCount, units)`.
2. **Broadcast detection route** — `src/app/api/youtube/broadcast/route.ts` (`GET`, App Router): session-auth (`requireSession`) + Pro gate; calls **`liveBroadcasts.list?broadcastStatus=active&broadcastType=all&mine=true&part=snippet,status`** with the user's token — **this exact method, exclusively; `search.list` is forbidden anywhere in this feature** (spec §3.6: 100-units-per-call with a 100-calls/day hard cap makes it the realistic quota trap). If live: upsert an open `yt_stream_sessions` row with `liveChatId` (from `snippet.liveChatId`), return `{ live: true }`; if not: close any open row, return `{ live: false }`. Per spec §3.6 this is **infrequent**: invoked on live-view mount, on a manual "check now" action, and on a slow client timer (e.g. every 3–5 min while a tab is open and no broadcast is active — the slow background check is this same `liveBroadcasts.list` call, nothing else) — never a fast loop, and never running with no tab open (AC4: zero API consumption).
3. **Chat ingestion route — built per the Gate 1 mode decision** (shared core either way: `requireSession` + Pro gate → resolve youtube `linked_accounts` row (401/403 otherwise) → `getValidAccessToken()` (transparent refresh — AC7) → require an open `yt_stream_sessions` row (`{ status: "not_live" }` if none — client must confirm the broadcast first) → map + persist → advance session state. Tokens never appear in responses or logs.):
   - **Mode A (default) — `src/app/api/youtube/chat/route.ts`**, stateless request/response per tick:
     1. Call `liveChatMessages.list(liveChatId, part=snippet,authorDetails, pageToken=chat_page_token)`.
     2. Respond `{ messages: ChatMessage[], pollingIntervalMillis, status: "live" }` — the client schedules the next tick from the **returned** `pollingIntervalMillis`, never a hardcoded interval.
   - **Mode B — `src/app/api/youtube/chat/stream/route.ts`**, client-held SSE with a bounded `maxDuration` (transport template: the torn-down `api/events/youtube-chat` route, with the InnerTube scraper swapped for official **`liveChatMessages.streamList`**): consume the server stream, relay mapped messages as typed SSE frames, persist each response's `nextPageToken` to `yt_stream_sessions.chat_page_token` as frames arrive; on window expiry/disconnect the client reconnects and the route **resumes from the persisted `pageToken`** (overlap deduped by `event_id`).
   - **Shared mapping/persistence (mode-independent)** — new `src/lib/youtube-api-mapper.ts`: `textMessageEvent` → `chatMessagesRepository.insert` (`platform: "youtube"`, `eventId` = API message `id` — real dedup key, unlike the scraper); `superChatEvent`/`superStickerEvent` → `ytSuperChatEventsRepository.insert` using **structured** `amountMicros` + `currency` (Super Stickers stored as superchat rows, message = sticker alt text). Inserts are `onConflictDoNothing`, so overlapping polls/reconnect windows are harmless. **No membership parsing in v1** (spec §2).
   - **Shared session advance** — `chat_page_token = nextPageToken`, `pollCount++` (Mode B: per connection window), `quotaUnits += measured cost` (from the spike's numbers, cross-checked against console metrics — never an assumed constant), `lastPolledAt = now`.
   - **Shared error contract** — 403 `quotaExceeded` → `{ status: "quota", retryAfterMillis }` (Mode B: typed SSE error frame then close); `liveChatEnded`/404 → close session, `{ status: "ended" }`; refresh failure → `{ status: "reconnect_required" }`.
4. **Client loop — mode-conditional rewrite of `src/hooks/use-youtube-chat.ts`**: `useYouTubeChat(enabled)` → `{ messages, status }` in both modes (so `live-client.tsx` is mode-agnostic).
   - *Mode A:* confirm broadcast (route 2) → `setTimeout` chain calling route 3, **next delay = returned `pollingIntervalMillis`**; on `quota` back off per `retryAfterMillis` (exponential floor, no retry storm).
   - *Mode B:* confirm broadcast → open `EventSource` to the stream route (the pre-teardown hook shape); on window close/`maxDuration` expiry reconnect with backoff — resume is server-side via the persisted `pageToken`; same typed quota/ended handling from SSE error frames.
   - *Both:* on `ended`/`not_live` drop to the slow broadcast-detection cadence; pause via `document.visibilitychange`; full stop on unmount; **zero YouTube API calls of any kind when no broadcast is live or no tab is open** (revised AC4). Google tokens never reach the browser — the client only drives timing/liveness.
5. **UI** — `live-client.tsx`: YouTube status chip ("YouTube: live / not live / quota-limited / reconnect / disconnected") next to the existing platform badges; Super Chats already render highlighted via existing `superchat` styling in the Recent Events feed (persistence-driven SSE — no changes needed); add the accepted-limitation copy "YouTube chat is live while CreatorDeck is open" to the chat header/connections manage panel.
6. **Event delivery** — none needed: persisted `yt_superchat_events` rows flow through `liveEventFeedService` → `/api/events/stream` → `useStreamEvents` → dashboard/live/widget, platform-badged (§1.4 finding). Chat interleaving already exists in `live-client.tsx`.

**Gate 2 verification (acceptance criteria 2–5), against a real test broadcast on the owner's channel, mode-neutral:**
- AC2: message sent on YouTube appears in unified feed within one polling interval (Mode A) / with sub-interval push latency (Mode B), interleaved with Twitch (timestamps ordered).
- AC3: real Super Chat (or lowest-tier test) lands in `yt_superchat_events` with correct amount/currency, renders in event feed, persists across reload (history query).
- AC4 (revised wording — "zero YouTube API consumption when no broadcast is live"): with no broadcast, server logs show only the infrequent `liveBroadcasts.list` detection calls and **zero chat-ingestion calls**; with all dashboard tabs closed, **zero YouTube API consumption at all** — confirmed by Google Cloud console per-method metrics going flat, not just by our own logs. Mode B additionally: window expiry mid-broadcast reconnects and resumes from `chat_page_token` with no message gap.
- AC5: simulate 403 `quotaExceeded` (dev shim or exhausted dev-project quota): chip shows quota-limited, backoff visible in network tab, no crash/storm (Mode B: no reconnect storm).
- AC7: leave a session running >1 h; observe transparent refresh in logs (token value never logged), chat continues.

### Phase 3 — Hardening, gating & dogfood (spec Phase 3; Gate 3)
1. **Quota instrumentation (spec §3.6, in-scope requirement):** per-session `pollCount`/`quotaUnits` (written in Phase 2 step 3), **counting broadcast-detection `liveBroadcasts.list` calls as well as chat calls**, + a session summary log line on close (`channelId`, duration, polls/windows, units, messages). Surface a read-only "quota used this session" line in the connections manage panel or `/dev` toolbar. Unit accounting is **measured, never assumed** (spec §3.6: `liveChatMessages.list` cost is unpublished by Google — community range 1–5 units; `streamList` community-measured ~1 unit/connection): seed per-call costs from the Gate 1 spike measurements and re-verify against Google Cloud console per-method metrics during dogfood. Envelope for context only — Mode A at a ~5 s returned interval is ~720 calls/stream-hour ⇒ anywhere from ~720 to ~3,600 units/stream-hour depending on the true cost (pessimistic end: the 10,000-unit/day default dies in <3 stream-hours); Mode B would make chat near-free and leave detection as the dominant spend. File the audited quota-increase request (the ship-within-10k-then-apply-with-data path, per research §1.1) with real dogfood numbers.
2. **Pro gating (dependency: billing plan Phases 1–2):** wrap the chat-ingestion route (`/api/youtube/chat` or `/api/youtube/chat/stream`, per the Gate 1 mode), `GET /api/youtube/broadcast`, and `/api/connections/link/google/start` in `requirePro`; Connections page renders the YouTube row visible-but-locked for free users (billing spec's locked-UI pattern); the YouTube rows belong in the billing spec's gate inventory and its criterion-6 free-account sweep verifies AC6 here. Until billing Phase 1 lands, an interim owner-only flag (existing `isAdmin` or a feature flag row) may gate dogfooding — swapped for `requirePro` the moment it exists.
3. **Error-state polish:** reconnect-required UX on `invalid_grant`; scrub tokens from all error paths (grep audit); Sentry-style logging stays free of credentials (currently `console.*` only).
4. **Dogfood (AC8 / Gate 3):** one full real multi-platform stream by user zero: unified chat live for the whole stream, ≥1 Super Chat captured end-to-end, screen recording archived (doubles as Polar review material). Capture quota totals from instrumentation.

### Acceptance-criteria → phase map
| AC | Verified at |
|---|---|
| 1 (connect/reconnect/disconnect+revoke, encrypted) | Gate 1 |
| 2 (chat within one interval, interleaved) | Gate 2 |
| 3 (Super Chat amount+currency, persisted) | Gate 2 |
| 4 (ingestion lifecycle; **zero YouTube API consumption when no broadcast is live** — revised wording, mode-neutral) | Gate 2 |
| 5 (quota degradation) | Gate 2, re-checked Gate 3 |
| 6 (Pro lockout) | Gate 3 (with billing Phase 2) |
| 7 (token refresh across >1 h) | Gate 2 |
| 8 (dogfood stream + recording) | Gate 3 |

Gate 1 additionally requires (spec §6, revised): **the §3.1 ingestion-mode decision made with measurements** — not an acceptance criterion, but a gate condition; recorded as a decision note appended to this plan.

### Risk → phase mapping (spec §7, including the two rows added in the revision)
| Spec §7 risk | Where this plan handles it |
|---|---|
| **`list` per-call cost unpublished by Google** *(new row)* | Phase 1 spike measures both modes via Google Cloud console per-method metrics; Phase 2 session `quotaUnits` uses measured costs (never assumed constants); Phase 3 re-verifies during dogfood and files the increase with real numbers |
| **Mode B: `streamList` long-lived connections vs Vercel limits (reconnect seams)** *(new row)* | Phase 1 spike deliberately kills a window mid-stream and proves gap-free resume from `yt_stream_sessions.chat_page_token`; `event_id` + `onConflictDoNothing` absorbs overlap; decision rule defaults/falls back to Mode A; Gate 2 AC4 check re-tests the seam under a real broadcast |
| Google sensitive-scope verification takes weeks | Phase 1 owner tasks, week 1; test-user allowlist covers dogfood meanwhile |
| Quota insufficient for >1 concurrent streamer | Phase 3 instrumentation → audited-increase request with dogfood data |
| Dashboard-closed = no ingestion | Phase 2 UI copy ("YouTube chat is live while CreatorDeck is open"); worker architecture explicitly out of v1 (spec notes `streamList` makes one cheaper later — revisit post-validation) |
| `useStreamEvents`/SSE Twitch-coupled | Resolved at Gate 0: it is not coupled (§1.4) — no rework needed |

---

## 4. Gate 0 decisions (2026-07-03) — product-level questions resolved

*Confirmed by the owner in the 2026-07-03 interactive Gate 0 review.*

1. **Memberships** — **Dark in v1, per spec.** Membership events do arrive in the same `liveChatMessages` responses at zero extra quota, but ingesting them widens Gate 2's testing surface (requires an eligible channel) and the Google demo-video story. Tables, mappers, and read-side UI stay; historical rows keep rendering; the fast-follow is one parse branch away.
2. **Google as a login method** — **Keep Google login, scope reduced to `youtube.readonly`** (the §1.3 decision stands). Google verification is per-project, so dropping the login flow wouldn't shrink the scope set to justify — and removing a live login method orphans Google-keyed accounts. Revisit only if verification stalls specifically on the login surface.
3. **Encrypt Twitch/Spotify tokens too** — **Yes: the helper applies to all providers on write** (Phase 1 item 3 already written this way). Uniform security posture for roughly one branch of extra scope; the `enc:v1:` prefix makes migration incremental with no backfill task.
4. **Channel avatar on Connections page** — **Ship it in v1** *(overrides the plan's earlier name-only assumption — spec §4's letter says name/avatar)*. Near-zero cost: the connect flow's `channels.list` response already carries `snippet.thumbnails`, so it's the `avatarUrl` column on migration #1 plus one mapped field (Phase 1 items 2/4/7 updated).

---

## 5. Implementation log

### Phase 0 — Teardown ✅ (2026-07-03, build green)
- Removed deps `youtube-chat`, `ws`, `@types/ws` (`package.json` / lockfile).
- Deleted `src/app/api/events/youtube-chat/route.ts` and `src/lib/youtube-chat-mapper.ts`.
- `src/hooks/use-youtube-chat.ts` reduced to an inert stub returning `ChatMessage[]` (`live-client.tsx` unchanged, Twitch-only chat works).
- `src/lib/auth.ts` GoogleProvider scope dropped `youtube.force-ssl` → `youtube.readonly`.

### Phase 1 — Foundation (repo code) ✅ (2026-07-03, build green; crypto round-trip/tamper/wrong-key verified)
- **`src/lib/token-crypto.ts`** — AES-256-GCM, `enc:v1:<iv>:<tag>:<ciphertext>` (base64url), `isEncrypted`/`encrypt`/`decrypt`/`ensureEncrypted`. Key from new env `TOKEN_ENCRYPTION_KEY` (added to `src/lib/env.ts`).
- **Migration #1** — `linked_accounts` gains `token_expires_at`, `scopes`, `avatar_url` in `src/lib/schema.ts`. *(See deviation D-B below — `drizzle/` is gitignored; apply is `db:push:all`, owner-run.)*
- **`linked-accounts.repository.ts`** — encrypt on write (`upsertForUser`/`upsertWithUser`/`updateAccessToken`, all extended for the new columns) + **decrypt centrally in every finder** so all callers keep getting plaintext; added narrow `getDecryptedTokens(userId, provider)`.
- **`connections.service.linkGoogleAccount`** — persists `tokenExpiresAt` (`now + expires_in`), granted `scope`, and `avatarUrl` from `channels.list` thumbnails.
- **`youtube.service.ts`** — rewritten: `getValidAccessToken(userId)` (proactive refresh w/ 60 s skew, encrypted persist, null on `invalid_grant`), `revokeAccess(userId)` (best-effort), `fetchYouTubeSubCount(userId)` now token-agnostic. Dashboard call site updated.
- **`disconnect/route.ts`** — revokes the Google grant for provider `youtube` before deleting the row; `DisconnectButton` shows a YouTube confirm mentioning revocation.
- **Connections UI** — `YouTubeManage` shows channel avatar, "YouTube chat is live while CreatorDeck is open" copy, and a reconnect-required state; page computes `needsReconnect` from `getValidAccessToken` returning null.

### Interim gating ✅ (2026-07-03, build green) — owner-only via `isAdmin`
- **`src/lib/youtube-gate.ts`** — single `hasYouTubeAccess(session)` swap point (returns `session.isAdmin` for now; becomes `hasPro(session)` when billing lands — no call-site changes). Gates the YouTube *feature*, not the Google *login* identity method (Gate 0 D2).
- **`/api/connections/link/google/start`** — redirects non-admins to `/connections` (server-side boundary).
- **Connections page** — YouTube row rendered visible-but-locked for non-admins (🔒 Pro chip, no manage panel, no Connect/Disconnect); `getValidAccessToken` skipped when locked so non-Pro users trigger zero Google calls.
- When billing ships, replace the body of `hasYouTubeAccess` and extend gating to the Phase 2 routes (`/api/youtube/broadcast`, chat-ingestion) — they should import the same helper.

### Phase 2 — Ingestion (Mode A) ✅ code complete (2026-07-03, build green; Gate 2 needs a live broadcast)
Built the **Mode A** (stateless polling) path as the plan's documented default, ahead of the Gate 1 spike (which requires a live channel to run). If the spike later favors Mode B, the mapper/persistence/session layers are reused; only the route/hook transport changes.
- **Migration #2** — `yt_stream_sessions` gains `poll_count`, `quota_units`, `last_polled_at`. `ytStreamSessionsRepository` gains `findActive`/`open`/`close`/`advance` (kept `isActive`). *(Apply via `db:push:all` — owner.)*
- **`youtube.service`** — `getActiveBroadcast` (`liveBroadcasts.list mine=true` **only**, never `search.list`) and `fetchLiveChatMessages` (typed quota/ended result, honors `pollingIntervalMillis`). `YT_LIST_UNITS_ESTIMATE = 5` is a **placeholder** cost pending measurement (spec §3.6).
- **`youtube-api-mapper.ts`** — `textMessageEvent` → `chat_messages`; `superChatEvent`/`superStickerEvent` → `yt_superchat_events` (structured `amountMicros`+`currency`; stickers use alt text). `eventId` = API message id (real dedup). No membership parsing (spec §2).
- **`GET /api/youtube/broadcast`** — session + Pro gate; opens/closes the session as liveness changes.
- **`GET /api/youtube/chat`** — session + Pro gate → `getValidAccessToken` → require open session (`not_live` else) → list → map/persist (`onConflictDoNothing`) → `advance` → `{ status, messages, pollingIntervalMillis }`. Typed `quota`/`ended`/`reconnect_required` contract.
- **`use-youtube-chat`** — rewritten to `{ messages, status }`: confirm broadcast → poll on the server's `pollingIntervalMillis`, quota backoff, slow detection cadence when not live, `visibilitychange` pause, full stop on unmount (zero API calls with no live broadcast / no open tab — AC4).
- **`live-client.tsx`** — consumes the new contract; YouTube status chip (live / not live / quota-limited / reconnect). Super Chats reach the event feed via existing `liveEventFeedService` persistence (no pipeline change — §1.4).
- **Not yet done (deferred, correctly):** quota instrumentation surfacing + measured unit costs (Phase 3); counting broadcast-detection calls toward `quotaUnits` (Phase 3). **Gate 2 acceptance (AC2–5, 7) is unverified** — it requires a real broadcast on the owner's channel with real Google credentials; cannot be exercised headless.

### Phase 3 — Quota instrumentation ✅ code complete (build green; live-session numbers need a real broadcast)
Implements spec §3.6 / Phase 3 step 1 (the deferred item above). No schema migration — reuses the existing `poll_count`/`quota_units` columns.
- **`YT_BROADCAST_UNITS_ESTIMATE = 1`** in `youtube.service.ts` (exported via `services/index.ts`) — `liveBroadcasts.list` is a firm 1-unit-class method, unlike the still-placeholder `YT_LIST_UNITS_ESTIMATE = 5`.
- **`ytStreamSessionsRepository.recordDetection(channelId, units)`** — adds detection cost to the open session's `quotaUnits`; no-op when idle (detection-while-not-live has no session to attribute to — a separate low constant background cost, documented).
- **`GET /api/youtube/broadcast`** — records one detection unit against the session each time it confirms live, so `quotaUnits` now reflects **detection + chat**, not chat alone.
- **`close()`** — emits a session-summary log line before deleting the row: `{ channelId, durationSec, chatPolls, estQuotaUnits, lastPolledAt }` — the record used to size the Google quota-increase request.
- **Connections manage panel** — shows a read-only `N chat polls · ~M units (est.)` line while a session is live (`connections/page.tsx` now reads `findActive` and passes `pollCount`/`quotaUnits` to `YouTubeManage`).
- **Still measured, not assumed:** `YT_LIST_UNITS_ESTIMATE` remains the pessimistic placeholder pending Google Cloud console per-method measurement (spec §3.6). The instrumentation now makes those numbers observable per session; reconcile against console metrics during dogfood.
- **Not done here:** Pro gating swap (billing-dependent, Phase 3 step 2 — this branch stays on the interim `isAdmin` gate).

### Phase 3 — Error-state hardening ✅ code complete (build green)
Implements Phase 3 step 3 (reconnect UX, quota degradation, token-scrub audit).
- **Reconnect-required UX in the live view** — the YouTube status chip is now a one-click reconnect link (`/api/connections/link/google/start`, same entry as the Connections "Reconnect" button) when a token is revoked (`invalid_grant` → `reconnect_required`), with an explanatory `title`. Self-heals once reconnected.
- **Quota degradation** — the chat hook now escalates the quota backoff exponentially (server `retryAfterMillis` as floor, ×2 per consecutive hit, capped at 10 min) and resets on a healthy tick, instead of re-hitting the quota error every 60 s for the rest of a stream once daily quota is exhausted. Quota-limited chip gains an explanatory `title`.
- **Token-scrub audit (grep, no code change needed):** service layer has zero `console.*` and silent catches (tokens never logged); the only OAuth error log (`[google/callback]`) records `err` + `userId` for *unexpected* errors only — `err` is a network/parse failure that never carries the access token, refresh token, or auth code (those are local vars, never attached). "console.* only, no credentials" already holds.

### Deviations from the plan/spec (surfaced for owner review)
- **D-A — Token encryption uses decrypt-in-finders, not the "narrow accessor only" read model.** Gate 0 D3 mandated encrypting *all* providers. The plan's read model ("raw rows never carry plaintext", via a narrow accessor) would require migrating ~12 Twitch/Spotify read sites (`dashboard`, `spotify-service`, spotify routes/widgets, `stream-info`, `chat-auth`, `onboarding/backfill`, `live/page`) that read `account.accessToken` directly — outside this workstream and unverifiable headless. Encrypting writes without that migration would feed `enc:v1:…` to Twitch/Spotify APIs and break them. Chosen: encrypt on write + **decrypt transparently in the repository finders**, achieving D3's core at-rest goal with zero blast radius. Follow-up (defense-in-depth): migrate token consumers to `getDecryptedTokens` so page-level rows stop carrying plaintext in server memory.
- **D-B — Migrations apply via `db:push`, not committed migration files.** The plan assumed a tracked squashed `0000_abandoned_sprite.sql` and an incremental `0001`. In fact `drizzle/` is **gitignored**; the deploy path is `drizzle-kit push` (schema-diff). `schema.ts` is the source of truth; `db:generate` output is local/ephemeral. **The column additions are NOT yet applied to any DB** — owner runs `npm run db:push:all` (per the DB-migrations decision: I generated only, did not touch prod; local DB URL is a dummy).

### Owner / blocked items (not code)
1. **Set `TOKEN_ENCRYPTION_KEY` as a Vercel secret** (32-byte base64). A local dummy key was generated into gitignored `.env.local` for build verification only.
2. **Apply migration #1**: `npm run db:push:all` (adds 3 nullable columns — additive, safe).
3. **Google Cloud (Phase 1 owner tasks)**: consent screen, test-user allowlist, redirect URIs, start `youtube.readonly` sensitive-scope verification.
4. **Gate 1 ingestion-mode spike (Mode A vs B)** — requires a live channel on the dev Google project; blocks Phase 2's route/hook shape. Plan default is Mode A.
5. **Billing dependency** — Pro gating (`requirePro`/`hasPro`) is Phase 3 and depends on the billing workstream. Interim `isAdmin` gate **is now wired** (see Interim gating above); swap `hasYouTubeAccess`'s body for `hasPro` when billing lands.
