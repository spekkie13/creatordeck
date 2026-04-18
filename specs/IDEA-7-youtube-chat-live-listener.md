# IDEA-7: YouTube Chat Live Listener (youtube-chat)

## Status: Draft

---

## 1. Overview

Replace the deleted cron-based YouTube chat polling with a connection-driven listener using the `youtube-chat` npm package. The SSE connection is already opened automatically when the user navigates to `/live` via the existing `useYouTubeChat` hook — no new client-side wiring is needed. When that connection is established, the server starts a `LiveChat` listener for their YouTube channel, pipes incoming messages into the `chatMessages` DB table (and optionally `ytMemberEvents` / `ytSuperChatEvents`), and emits them directly over the SSE stream. The listener stops when the user leaves the page and the connection closes.

This fits Vercel's serverless model — the SSE connection keeps the function alive for its duration with no background process required.

**Key tradeoff:** Messages that arrive while no client has `/live` open will be missed. This is acceptable — the platform only needs chat ingestion while a user is actively viewing. Short disconnects (network blips, tab refreshes) are mitigated by an SSE reconnect + DB replay mechanism (see §4). Native `EventSource` handles reconnection automatically and sends `Last-Event-ID` without any manual hook logic.

---

## 2. Scope

### In scope
- Install `youtube-chat` npm package
- Rewrite `api/events/youtube-chat` to start a `LiveChat` listener on client connect and stop it on disconnect
- Insert plain text chat messages into `chatMessages` via `chatMessagesRepository.insert()`
- Emit messages directly over the SSE stream as they arrive (no DB polling in this endpoint)
- SSE reconnect policy: stamp each event with `id: <occurredAt ISO>`, replay missed DB rows on reconnect via `Last-Event-ID` header; native `EventSource` handles reconnection and sends `Last-Event-ID` automatically
- Graceful close with a typed error event if the channel is not live at connect time
- **Bonus:** detect superchats and memberships from `ChatItem` flags, insert into `ytSuperChatEvents` / `ytMemberEvents`, and emit over SSE
- Multiple simultaneous users: each SSE connection runs its own `LiveChat` instance; duplicate inserts are harmless due to `onConflictDoNothing()` on `eventId`
- Set `maxDuration = 800` on the route (Vercel Pro streaming limit)
- Update `useYouTubeChat` hook to parse the new typed event format (currently expects arrays of DB rows)

### Out of scope
- `api/chat/stream` (Twitch broadcaster endpoint) — untouched
- Any background/cron listener that runs without a connected client
- True gap coverage when no client is connected (Problem B) — would require separate infrastructure or a cron fallback
- Restoring the `ytStreamSessions` write path
- Manual reconnect logic in the hook — native `EventSource` handles this

---

## 3. Data model

No schema changes. Existing tables used as-is:

| Table | Operation | Notes |
|-------|-----------|-------|
| `chatMessages` | `insert()` | `platform = "youtube"`, `channelId = session.youtubeChannelId`, `eventId` = stable unique ID from `ChatItem` (see note) |
| `ytMemberEvents` | `insert()` | When `ChatItem.isMembership === true` (bonus) |
| `ytSuperChatEvents` | `insert()` | When `ChatItem.superchat` is present (bonus) |

**Note on `eventId`:** The `youtube-chat` package does not document a guaranteed unique message ID on `ChatItem`. Before implementation, inspect the raw `ChatItem` object to find the best deduplication key. Candidates: an `id` field if present, or a composite of `author.channelId + timestamp.getTime()`.

---

## 4. API contract

### `GET /api/events/youtube-chat`

**Auth:** session required; `session.youtubeChannelId` must be present  
**Runtime:** `nodejs`  
**Max duration:** `800` (Vercel Pro)  
**Response:** `Content-Type: text/event-stream`

#### SSE framing

Each event is framed as:
```
id: <occurredAt.toISOString()>
data: <JSON payload>

```

The server also sends `retry: 3000` once at stream open, instructing the browser to reconnect after 3 seconds on drop.

#### Reconnect behaviour

On reconnect the browser sends `Last-Event-ID: <last seen ISO timestamp>`. The server:
1. Queries `chatMessagesRepository.getSince(new Date(lastEventId))` and emits any rows found (catch-up phase)
2. Then starts the `LiveChat` listener as normal (live phase)

#### Event payloads

| Event type | Payload shape | When emitted |
|------------|---------------|--------------|
| `chat` | `{ type: "chat", id, userDisplayName, userId, message, occurredAt }` | Each plain text message |
| `superchat` | `{ type: "superchat", id, userDisplayName, userId, message, amount, currency, occurredAt }` | Superchat (bonus) |
| `member` | `{ type: "member", id, userDisplayName, userId, levelName, memberMonths, occurredAt }` | Membership event (bonus) |
| `error` | `{ type: "error", reason: "not_live" }` | Channel not live at connect time — stream closes after |
| `error` | `{ type: "error", reason: "stopped", detail: string }` | Listener ended unexpectedly |

---

## 5. Module breakdown

| File | Action | Notes |
|------|--------|-------|
| `package.json` | Add dependency | `youtube-chat` |
| `src/app/api/events/youtube-chat/route.ts` | **Full rewrite** | Start `LiveChat` on connect; catch-up from DB if `Last-Event-ID` present; emit + insert on `chat` event; stop on abort signal |
| `src/lib/youtube-chat-mapper.ts` | **New file** | Converts `ChatItem` → `InsertChatMessage` / `InsertYtMemberEvent` / `InsertYtSuperChatEvent` DB shapes and → SSE event payload shapes |
| `src/hooks/use-youtube-chat.ts` | **Update** | Parse new typed event format (`{ type, id, ... }` objects) instead of arrays of DB rows; handle `superchat`/`member` types for bonus path; `Last-Event-ID` is sent automatically by native `EventSource` on reconnect — no manual changes needed for reconnect |

The `/live` page and `LiveClient` component require no changes — `useYouTubeChat(hasYouTube)` already opens the SSE connection on mount and closes it on unmount.

---

## 6. Dependencies

| Dependency | Detail |
|------------|--------|
| `youtube-chat` | npm package v2.2.0, no OAuth required — uses YouTube web scraping internally |
| `chatMessagesRepository.insert()` | Exists, no changes needed |
| `chatMessagesRepository.getSince()` | Exists, used for reconnect catch-up |
| `ytMemberEventsRepository.insert()` | Exists, used for bonus membership path |
| `ytSuperChatEventsRepository.insert()` | Exists, used for bonus superchat path |
| `maxDuration = 800` | Vercel Pro streaming function limit |

No new environment variables required.

---

## 7. Security considerations

- **`youtube-chat` grey area:** The package scrapes YouTube's internal endpoints rather than using the official API. YouTube may break it without notice. All errors from `LiveChat` must be caught and surfaced gracefully; failures should not crash the SSE handler.
- **Session auth:** Already enforced on the endpoint — no change.
- **User content:** `ChatItem` messages are stored and emitted as-is. No server-side HTML rendering; XSS risk is on the client to handle.
- **No new attack surface** introduced.

---

## 8. Test plan

| Scenario | Expected result |
|----------|----------------|
| Connect while channel is live | SSE stream opens, messages appear in real time, rows inserted in `chatMessages` |
| Connect while channel is not live | `{ type: "error", reason: "not_live" }` emitted, stream closes cleanly |
| Client disconnects and reconnects within gap | DB-persisted messages from the gap replayed immediately via `Last-Event-ID` catch-up (requires another client to have been connected during the gap) |
| Client disconnects, no other client connected | Gap messages are lost — expected and accepted behaviour |
| Two clients on the same YouTube account | Both receive messages; DB has no duplicates (conflict ignored) |
| Superchat received (bonus) | Row inserted in `ytSuperChatEvents`, `superchat` event emitted over SSE |
| Membership event received (bonus) | Row inserted in `ytMemberEvents`, `member` event emitted over SSE |
| `youtube-chat` emits an error mid-stream | `{ type: "error", reason: "stopped", detail: ... }` emitted, listener stopped cleanly |
