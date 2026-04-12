# Spec: [IDEA-6] Direct YouTube Live Chat Polling

**Status:** Specced, awaiting approval

---

## 1. Overview

YouTube's `liveChatMessages` API is accessible via OAuth tokens obtained through the existing Google OAuth flow. The user's Google OAuth credentials (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`) already have the necessary scope, and the `linkedAccounts` table already stores per-user access and refresh tokens.

The current `youtube-poll` cron detects active broadcasts and manages stream sessions but does not fetch chat messages. This spec extends it to also ingest live chat by storing the `liveChatId` from the broadcast response and polling `liveChatMessages.list` on each cron tick, using `nextPageToken` for incremental fetching.

This replaces the StreamElements bridge approach (IDEA-5) for chat ingestion. The existing `chatMessages` table and SSE endpoint require no changes — messages are inserted with `platform = "youtube"` and surface in the dashboard as-is.

---

## 2. Scope

**In scope:**
- Add `liveChatId` and `chatPageToken` columns to `ytStreamSessions` table
- Drizzle migration for the new columns
- Extend `pollAccount()` to store `liveChatId` when opening/updating a session
- New `pollChatForAllAccounts()` on `YoutubeService` — fetches `liveChatMessages.list` for each active session, bulk-inserts messages, updates `chatPageToken`
- Call `pollChatForAllAccounts()` from the existing `youtube-poll` cron endpoint after `pollAllAccounts()`

**Out of scope:**
- Changing the SSE endpoint or `useYouTubeChat` hook
- SuperChat or member event ingestion via chat polling
- Real-time (<1 min) message delivery — cron cadence is once per minute, which is acceptable
- Removing IDEA-5 infrastructure (SE accounts may still be linked; webhook endpoint left in place)

---

## 3. Data Model

### `ytStreamSessions` — two new nullable columns

```typescript
liveChatId:    text("live_chat_id"),      // from broadcast.snippet.liveChatId
chatPageToken: text("chat_page_token"),   // nextPageToken from last liveChatMessages response
```

Both are nullable:
- `liveChatId` is null when YouTube does not return a chat for the broadcast (rare, e.g. test broadcasts without chat enabled)
- `chatPageToken` is null on the first poll for a session; after the first successful fetch it holds `nextPageToken` from the response

No other schema changes needed. `chatMessages` already supports `platform = "youtube"`.

---

## 4. API Contract

No new public endpoints. The existing cron endpoint is unchanged in signature.

### YouTube API calls (server → Google)

**Broadcast detection (existing):**
```
GET https://www.googleapis.com/youtube/v3/liveBroadcasts
  ?part=id,snippet,status&broadcastStatus=active
Authorization: Bearer {accessToken}
```
Response field used: `items[0].snippet.liveChatId` — store on the open session.

**Chat message fetch (new):**
```
GET https://www.googleapis.com/youtube/v3/liveChatMessages
  ?part=snippet,authorDetails
  &liveChatId={liveChatId}
  [&pageToken={chatPageToken}]    ← omitted on first call for this session
  &maxResults=2000
Authorization: Bearer {accessToken}
```
Key response fields:
| Field | Usage |
|---|---|
| `nextPageToken` | Stored as new `chatPageToken` |
| `pollingIntervalMillis` | Logged only; cron cadence is fixed at 1 min |
| `items[].id` | `eventId` (dedup key) |
| `items[].snippet.publishedAt` | `occurredAt` |
| `items[].snippet.authorChannelId` | `userId` |
| `items[].authorDetails.displayName` | `userDisplayName` |
| `items[].snippet.textMessageDetails.messageText` | `message` |
| `items[].snippet.type` | Filter: only `textMessageEvent` items are stored |

---

## 5. Implementation Plan

### Step 1 — Schema: add columns to `ytStreamSessions`

In `src/lib/schema.ts`, add to `ytStreamSessions`:

```typescript
liveChatId:    text("live_chat_id"),
chatPageToken: text("chat_page_token"),
```

Then run:
```bash
npx drizzle-kit generate
npx drizzle-kit migrate
```

---

### Step 2 — Repository: expose update method on `ytStreamSessionsRepository`

Add method to `src/repositories/yt-stream-sessions.repository.ts`:

```typescript
async updateChatState(
  channelId: string,
  liveChatId: string,
  chatPageToken: string,
): Promise<void>
```

Updates `liveChatId` and `chatPageToken` on the open session for the given `channelId`.

Also add:

```typescript
async findAllOpenWithChatId(): Promise<YtStreamSession[]>
```

Returns all sessions where `endedAt IS NULL` and `liveChatId IS NOT NULL`. Used by the chat poll step.

---

### Step 3 — Service: store `liveChatId` in `pollAccount()`

In `src/services/youtube.service.ts`, after `ytStreamSessionsRepository.openIfNew(...)`:

```typescript
if (broadcast.snippet?.liveChatId) {
  await ytStreamSessionsRepository.updateLiveChatId(
    account.providerAccountId,
    broadcast.snippet.liveChatId,
  )
}
```

Add a lightweight `updateLiveChatId(channelId, liveChatId)` repository method (sets only `liveChatId`, leaves `chatPageToken` untouched so an existing token is preserved across poll ticks).

---

### Step 4 — Service: new `pollChatForAllAccounts()`

Add to `YoutubeService`:

```typescript
async pollChatForAllAccounts(): Promise<{ ok: boolean; errors: PollError[] }>
```

Logic:
1. `findAllOpenWithChatId()` — get all active sessions that have a `liveChatId`
2. For each session, look up the corresponding `linkedAccount` by `channelId` to get the access/refresh token
3. Call `pollChatForSession(account, session)` via `Promise.allSettled`
4. Return aggregated errors

```typescript
private async pollChatForSession(
  account: LinkedAccount,
  session: YtStreamSession,
): Promise<void>
```

Logic:
1. Build URL: `liveChatMessages?part=snippet,authorDetails&liveChatId={session.liveChatId}&maxResults=2000` + optional `&pageToken={session.chatPageToken}`
2. Call `ytGet()`, handle 401 → refresh token → retry (reuse existing pattern)
3. Parse response:
   - Filter `items` to `snippet.type === "textMessageEvent"`
   - For each, call `chatMessagesRepository.insert()` with:
     ```
     platform:         "youtube"
     channelId:        account.providerAccountId
     eventId:          item.id
     userId:           item.snippet.authorChannelId
     userDisplayName:  item.authorDetails.displayName
     message:          item.snippet.textMessageDetails.messageText
     occurredAt:       new Date(item.snippet.publishedAt)
     ```
   - Use `Promise.all` for the inserts (all are `onConflictDoNothing`)
4. Update `chatPageToken`: call `ytStreamSessionsRepository.updateChatState(channelId, liveChatId, nextPageToken)`

---

### Step 5 — Route: call `pollChatForAllAccounts()` after broadcast poll

In `src/app/api/cron/youtube-poll/route.ts`, after `pollAllAccounts()` resolves:

```typescript
const chatResult = await youtubeService.pollChatForAllAccounts()
```

Errors from the chat poll are logged but do not change the HTTP response code — broadcast session tracking must not be blocked by a chat failure.

The route is triggered by a cron-job.org job (see section 7) — no `vercel.json` cron entry is needed.

---

## 6. Error Handling

| Scenario | Behaviour |
|---|---|
| `liveChatMessages` returns 403 `liveChatEnded` | Log warning, call `ytStreamSessionsRepository.closeByChannelId()` — stream ended |
| `liveChatMessages` returns 403 `liveChatNotFound` | Log warning, clear `liveChatId` on session to skip future polls |
| Access token expired (401) | Refresh via existing `refreshYouTubeToken()` → retry once |
| Refresh fails | Log error, skip session — next cron tick will retry |
| `nextPageToken` missing in response | Log warning, do not update stored token (retain old one) |
| Insert fails for a single message | `onConflictDoNothing` absorbs duplicates; other errors bubble to `Promise.allSettled` |

---

## 7. Cron Configuration (cron-job.org)

The `youtube-poll` endpoint is triggered by an external cron-job.org job — not Vercel's built-in cron. cron-job.org supports 30-second minimum intervals on the free tier.

**Job settings:**
| Field | Value |
|---|---|
| URL | `https://<your-domain>/api/cron/youtube-poll` |
| Method | `GET` |
| Schedule | Every 1 minute (or 30 seconds if lower latency is desired) |
| Custom header | `Authorization: Bearer <CRON_SECRET>` |

No `vercel.json` cron entry is needed. `CRON_SECRET` is already validated in the route handler.

The `pollingIntervalMillis` value from the YouTube API response is logged for observability but not acted upon — cron cadence is fixed at the cron-job.org schedule.

---

## 8. Out-of-scope / Future

- Sub-minute polling: would require an always-on service (same constraint as IDEA-5); not needed for current use case
- SuperChat/member events via chat: `snippet.type` filtering already excludes them; they continue to flow through existing YT event polling if re-enabled
- SE bridge (IDEA-5): can remain dormant or be removed; its DB rows and endpoints are harmless alongside this approach