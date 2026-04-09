# Spec: [IDEA-5] StreamElements Integration (YouTube Chat)

**Status:** Specced, awaiting approval

---

## 1. Overview

YouTube's `liveChatMessages` API has been removed for third-party apps (confirmed: returns HTTP 404 with empty body from Google's scaffolding layer). StreamElements maintains a connection to YouTube chat on the streamer's behalf and exposes it via a socket.io connection to `realtime.streamelements.com`.

Since Vercel serverless functions cannot hold a persistent WebSocket connection, a small always-on **StreamElements Bridge** service (Node.js) will maintain one socket.io connection per connected user and forward chat messages to a new CreatorDeck webhook endpoint. Authentication uses StreamElements' JWT token — a static token users copy from their dashboard — requiring no OAuth redirect, minimising setup overhead to a single copy-paste.

The existing YouTube cron continues to run alongside, unchanged, for broadcast detection and stream session management.

### Hosting strategy
- **Initial (free):** Northflank Developer Sandbox — always-on Node.js, no sleep, free with card verification
- **When scaled:** Railway Hobby (~$5/mo) or Koyeb Eco (~$2/mo) — straightforward migration, no CreatorDeck changes needed

---

## 2. Scope

**In scope:**
- Connection flow: user pastes SE JWT token → validated against SE API → stored
- Bridge service: maintains one socket.io connection per SE-connected user, forwards YouTube chat messages to CreatorDeck
- Chat messages stored in the existing `chatMessages` table with `platform = "streamelements"`
- Bridge re-syncs account list every 5 minutes to pick up new connections/disconnections
- YouTube cron continues running for broadcast/session tracking (unchanged)

**Out of scope:**
- SE alert events (tips, subs, cheers, raids, follows) — not needed
- Replacing or modifying the existing Twitch integration
- StreamElements OAuth flow (JWT token is sufficient)
- StreamElements overlay or widget features

---

## 3. Data Model

No new tables required. `linkedAccounts` stores SE tokens with `provider = "streamelements"`, JWT in `accessToken`, `refreshToken = null`.

Chat messages use the **existing `chatMessages` table** with `platform = "streamelements"`.

---

## 4. API Contract

### Internal — used only by the Bridge

**`GET /api/internal/se-accounts`**
- Auth: `Authorization: Bearer {BRIDGE_SECRET}`
- Response:
```json
{
  "accounts": [
    { "channelId": "string", "jwtToken": "string" }
  ]
}
```

**`POST /api/webhooks/streamelements`**
- Auth: `Authorization: Bearer {BRIDGE_SECRET}`
- Body:
```ts
{
  channelId: string   // SE channel ID (providerAccountId)
  eventId: string     // unique message ID from SE
  userDisplayName: string | null
  userId: string | null
  message: string
  occurredAt: string  // ISO-8601
}
```
- Response: `{ ok: true }` — always 200 (bridge does not retry on app errors)

### User-facing

**`POST /api/connections/link/streamelements`**
- Auth: session
- Body: `{ jwtToken: string }`
- Validates token against `GET https://api.streamelements.com/kappa/v2/channels/me`
- Stores account via `linkedAccountsRepository.upsertForUser()`
- Response: `{ ok: true }` or `{ error: string }`

---

## 5. Component / Module Breakdown

### CreatorDeck (Next.js)

| File | Action |
|------|--------|
| `src/types/platform.ts` | Add `PLATFORM_STREAMELEMENTS = "streamelements"` |
| `src/services/connections.service.ts` | Add `linkStreamElementsAccount(userId, jwtToken)` |
| `src/app/api/connections/link/streamelements/route.ts` | New POST handler |
| `src/app/api/internal/se-accounts/route.ts` | New — returns accounts list for bridge |
| `src/app/api/webhooks/streamelements/route.ts` | New — receives chat messages, inserts into `chatMessages` |
| Connections UI | Add SE token input field and connect button |

### StreamElements Bridge (separate repo)

| File | Purpose |
|------|---------|
| `index.ts` | Entry point — initial account sync, manages connection lifecycle, re-syncs every 5 min |
| `se-client.ts` | socket.io connection per account, filters chat events, forwards to CreatorDeck |
| `creatordeckApi.ts` | HTTP client for `/api/internal/se-accounts` and `/api/webhooks/streamelements` |

---

## 6. Dependencies

### CreatorDeck
No new npm packages required.

### Bridge service
- `socket.io-client` — SE real-time connection
- Native `fetch` (Node 18+) — HTTP calls to CreatorDeck
- No direct database access — all persistence goes through CreatorDeck API

### New environment variables

| Variable | Location | Purpose |
|----------|----------|---------|
| `BRIDGE_SECRET` | CreatorDeck + Bridge | Shared secret authenticating bridge ↔ CreatorDeck |
| `CREATORDK_API_URL` | Bridge only | Base URL of deployed CreatorDeck app |

---

## 7. Security Considerations

- `BRIDGE_SECRET` must be validated on every request to `/api/internal/se-accounts` and `/api/webhooks/streamelements` — reject with 401 if absent or incorrect
- SE JWT tokens are sensitive — only ever returned to the bridge over HTTPS, never exposed to the client or logged
- `/api/internal/se-accounts` must never be publicly accessible; `BRIDGE_SECRET` is the sole gate
- Webhook handler uses `onConflictDoNothing()` on `eventId` — safe against duplicate delivery from bridge retries
- Bridge must not log JWT tokens at any level

---

## 8. Test Plan

- **Connection flow:** valid token links account; invalid token returns descriptive error; token already linked to a different user is rejected
- **Webhook handler:** chat message stored correctly in `chatMessages` with `platform = "streamelements"`; duplicate `eventId` silently ignored
- **Chat feed:** SE chat appears alongside Twitch chat in the existing chat feed
- **Bridge:** reconnects automatically on socket drop; re-syncs account list every 5 minutes; non-chat event types dropped without error or crash