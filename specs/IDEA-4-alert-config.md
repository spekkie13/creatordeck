# Spec: [IDEA-4] Alert Configuration System

**Tier:** Tier 2 (`GATES.customAlerts`)
**Status:** Specced, ready to build

---

## Overview

Custom alert overlays for OBS. Streamers configure per-event-type alerts (image/video, sound,
message template) through a dashboard UI. The widget at `/widget/alerts` fetches the config
via widget token and renders alerts using those assets.

Unfair advantages over Streamlabs / StreamElements:
- One overlay handles both Twitch and YouTube events natively
- Platform badge (Twitch/YouTube logo) on every alert — automatic, no config
- Raid follow batching — collapses follow bursts after a raid into one alert
- Goal milestone alerts — fires a special alert when a tracked goal target is hit
- "First of stream" template — special message for the first occurrence of each event type per session

---

## Database

### New table: `alert_configs`

Unique constraint on `(userId, eventType)`.

| Column | Type | Default | Notes |
|---|---|---|---|
| `id` | uuid | random | PK |
| `userId` | uuid | — | FK → users, cascade delete |
| `eventType` | text | — | sub / follow / bits / raid / superchat / member |
| `enabled` | bool | true | |
| `imageUrl` | text | null | GIF, PNG, JPG, MP4, WebM |
| `soundUrl` | text | null | MP3, WAV, OGG |
| `messageTemplate` | text | null | e.g. `{{user}} just subscribed!` |
| `duration` | int | 6 | seconds the alert is shown |
| `volume` | int | 80 | 0–100 |
| `batchRaidFollows` | bool | false | stored on `follow` row, applies globally |
| `milestoneEnabled` | bool | false | only meaningful for follow / sub / member |
| `milestoneImageUrl` | text | null | |
| `milestoneTemplate` | text | null | e.g. `Goal reached! {{user}} pushed us over {{amount}}!` |
| `firstOfStreamTemplate` | text | null | overrides messageTemplate for first occurrence per session |
| `updatedAt` | timestamp | now | |

### `LiveEvent` type additions (`src/types/events.ts`)

```ts
isMilestone?: boolean    // annotated server-side when goal target is crossed
batchedCount?: number    // set by SSE batch logic for raid follow bursts
```

---

## Template variables

| Variable | Resolves to |
|---|---|
| `{{user}}` | `event.fromUser` |
| `{{amount}}` | `event.amount` |
| `{{tier}}` | `event.tier` |
| `{{months}}` | `event.cumulativeMonths ?? event.amount` |
| `{{currency}}` | `event.currency` |
| `{{level}}` | `event.levelName` |
| `{{count}}` | `event.batchedCount ?? 1` |

Per-type variable hints shown in UI:

| Type | Available variables |
|---|---|
| sub | `{{user}}`, `{{amount}}`, `{{months}}` |
| follow | `{{user}}` |
| bits | `{{user}}`, `{{amount}}` |
| raid | `{{user}}`, `{{amount}}` |
| superchat | `{{user}}`, `{{amount}}`, `{{currency}}` |
| member | `{{user}}`, `{{months}}`, `{{level}}` |

---

## File upload

**Storage:** Vercel Blob (`@vercel/blob`)
**Env var:** `BLOB_READ_WRITE_TOKEN` — read automatically by the Blob SDK
**Path pattern:** `alerts/{userId}/{kind}/{timestamp}.{ext}`
**Max size:** 5 MB per file
**Allowed types:**
- Image/video: `image/jpeg`, `image/png`, `image/gif`, `image/webp`, `video/mp4`, `video/webm`
- Audio: `audio/mpeg`, `audio/wav`, `audio/ogg`

No cleanup of old blobs in V1. Accept orphans; implement a cleanup cron in V2.

---

## API Routes

### `GET /api/alerts/config`
- Auth: NextAuth session
- Gate: Tier 2, returns 403 otherwise
- Returns: `AlertConfig[]` for the authed user. Missing event types are filled with defaults.

### `PUT /api/alerts/config`
- Auth: NextAuth session
- Gate: Tier 2
- Body: `{ eventType: LiveEventType, ...patch }`
- Validates `eventType` against allowed values
- Upserts via `onConflictDoUpdate` on `(userId, eventType)`
- Returns: updated row

### `POST /api/alerts/upload`
- Auth: NextAuth session
- Gate: Tier 2
- Body: `multipart/form-data` with `file` (File) and `kind` (`"image"` | `"sound"`)
- Validates type and size client- and server-side
- Uploads to Vercel Blob, returns `{ url: string }`
- If `BLOB_READ_WRITE_TOKEN` is missing, returns 503 with a descriptive error

### `GET /api/widget/alerts/config?token=`
- Auth: widget token (`userRepository.findByWidgetToken`)
- Gate: checks `user.tier`, returns 403 + `{ error: "tier_required", tier: "tier2" }` if below Tier 2
- Returns: all `AlertConfig` rows for the user as a plain object keyed by `eventType`, with defaults filled in

---

## SSE Stream Enhancements (`/api/widget/events/stream/route.ts`)

### Tier gate (add first — highest risk)
After resolving user from widget token:
```ts
if (!hasAccess(user.tier, GATES.customAlerts)) {
  return new Response("Tier required", { status: 403 })
}
```
⚠️ **Breaking change** for any sub-Tier-2 users who currently have the widget active. Ship this first.

### Config load on connect
Load `alertConfigsRepository.findByUserIdAsMap(user.id)` once on SSE connect, stored in closure.
Not refreshed per-poll — stale config until widget reconnects (acceptable for V1).

### Raid follow batching
```ts
let lastRaidAt: Date | null = null
const BATCH_WINDOW_MS = 30_000
```

On each poll:
1. If any emitted event is `type === "raid"`, record `lastRaidAt = new Date()`
2. Check `configMap.get("follow")?.batchRaidFollows`
3. If enabled and within `BATCH_WINDOW_MS` of `lastRaidAt`:
   - Separate follow events from others
   - If multiple follows, emit one synthetic follow event:
     - `batchedCount = follows.length`
     - `fromUser = "${follows.length} new followers"`
     - Use first follow's `id` and `occurredAt`
4. Otherwise emit follows individually

Extract into a pure `batchFollowEvents(events, lastRaidAt, windowMs)` function for testability.

### Milestone annotation
For each emitted event of type `follow`, `sub`, or `member`:
- Query current goal count and goal target
- Rule: at most one `isMilestone = true` per poll batch per type
- Mark the last qualifying event in the batch if the cumulative count crosses the goal threshold

---

## Config UI (`/alerts`)

### Page structure (`page.tsx` — server component)
- Gets session, fetches configs + goals, passes to client component
- Below Tier 2: renders inline restricted state (not a redirect) with upgrade link

### Client component (`alerts-client.tsx`)
- State: `Map<LiveEventType, AlertConfig>` with defaults merged in
- Auto-saves on change with 1-second debounce via `PUT /api/alerts/config`
- Shows a "Saved" indicator

### Global settings card
- Raid batch toggle (reads/writes `batchRaidFollows` on the `follow` config row)

### Per-type card (`alert-type-card.tsx`)

Sections per event type:
1. **Header** — event type label + platform pill + enabled toggle
2. **Image** — file input (image/*, video/mp4, video/webm), preview (`<img>` or `<video>`), clear button
3. **Sound** — file input (audio/*), `<audio>` preview player, volume slider (0–100), clear button
4. **Template** — textarea with variable hint chips. Clicking a chip inserts the variable at cursor position. Falls back to default `alertSubtitle()` rendering when empty.
5. **Duration** — slider 1–30 seconds
6. **First of stream** — secondary textarea for `firstOfStreamTemplate`
7. **Milestone** (only for follow / sub / member, only if a goal exists for that type) — toggle, image upload, template input
8. **Test button** — POSTs a synthetic `LiveEvent` to `POST /api/events/replay`. UI note: "Widget must be open to preview."

---

## Widget Overlay Enhancements (`/widget/alerts`)

### On mount
1. Fetch `GET /api/widget/alerts/config?token=`, store as `Map<LiveEventType, AlertConfig>` in a ref
2. If 403 → set `tier2Blocked = true`, render `<RestrictedOverlay>` (do not connect SSE)

### Per-alert rendering
In `showNext()`:
1. Look up config for `next.type`
2. If `config.enabled === false` → dequeue silently, call `showNext()` again
3. Apply `config.duration` as hold duration (replaces URL param; URL param kept as fallback)
4. If `config.soundUrl` → `new Audio(url)`, set `volume = config.volume / 100`, call `.play()` — suppress errors silently

### Alert card content
- **Image/video** — if `config.imageUrl` set: render `<video autoPlay loop muted>` for mp4/webm, else `<img>`. Displayed to the left of text content.
- **Template** — if `config.messageTemplate` set, render `alertInterpolate(template, event)`. Otherwise fall back to `alertSubtitle(event)`.
- **Platform badge** — `TwitchLogo` or `YouTubeLogo` icon at ~14×14px in the top-right corner, colored with `PLATFORM_COLOR[event.platform]`. Always shown, no config.
- **Milestone** — if `event.isMilestone && config.milestoneEnabled`: use `milestoneImageUrl` and `milestoneTemplate` instead of base config.
- **Batched follow** — if `event.batchedCount > 1`: handled by `alertInterpolate` via `{{count}}`

### First-of-stream tracking
```ts
const firstSeenTypes = useRef<Set<LiveEventType>>(new Set())
```
In `showNext()`: if type not in set and `config.firstOfStreamTemplate` is set, use it instead of `messageTemplate`. Then add type to set. Resets on page/browser source reload.

---

## Shared component: `RestrictedOverlay`

Used by:
- `/alerts` page — for sub-Tier-2 users
- `/widget/alerts` — when SSE returns 403

Props: `{ message: string, linkLabel: string, linkHref: string }`
Renders a dark panel with message and a single link.

---

## New / Modified Files

### New
| File | Purpose |
|---|---|
| `src/repositories/alert-configs.repository.ts` | CRUD for alert_configs |
| `src/app/api/alerts/config/route.ts` | GET/PUT — session auth |
| `src/app/api/alerts/upload/route.ts` | POST — Vercel Blob upload |
| `src/app/api/widget/alerts/config/route.ts` | GET — widget token auth |
| `src/app/alerts/page.tsx` | Config page server component |
| `src/app/alerts/alerts-client.tsx` | Config UI client component |
| `src/app/alerts/alert-type-card.tsx` | Per-type card |
| `src/components/restricted-overlay.tsx` | Shared restricted state component |

### Modified
| File | Change |
|---|---|
| `src/lib/schema.ts` | Add `alertConfigs` table |
| `src/types/entities.ts` | Add `AlertConfig`, `InsertAlertConfig` |
| `src/types/events.ts` | Add `isMilestone?`, `batchedCount?` to `LiveEvent` |
| `src/repositories/index.ts` | Export `alertConfigsRepository` |
| `src/services/alerts.service.ts` | Add `alertInterpolate()` function |
| `src/services/index.ts` | Export `alertInterpolate` |
| `src/app/api/widget/events/stream/route.ts` | Tier gate, config load, batch logic, milestone annotation |
| `src/app/widget/alerts/page.tsx` | Config fetch, 403 handling, full rendering rework |
| `src/app/dashboard/app-header.tsx` | Add Alerts nav item |
| `src/lib/env.ts` | Add `BLOB_READ_WRITE_TOKEN` env handling |

---

## Build Order

1. Install `@vercel/blob`, add env var
2. Schema + `drizzle-kit generate` + apply migration
3. `entities.ts` + `events.ts` type additions
4. `alert-configs.repository.ts` + export from index
5. `alerts.service.ts` — add `alertInterpolate`
6. `GET/PUT /api/alerts/config`
7. `POST /api/alerts/upload`
8. `GET /api/widget/alerts/config`
9. **SSE tier gate** (breaking — confirm timing before shipping)
10. SSE batch + milestone logic
11. `restricted-overlay.tsx`
12. `/alerts` config page (server + client + card)
13. Nav update (`app-header.tsx`)
14. Widget overlay rework

---

## Risk Register

| Risk | Severity | Mitigation |
|---|---|---|
| SSE has no tier gate today — free users get live alerts | High | Add in step 9; ship last or with a communication |
| Milestone fires multiple times per burst | Medium | At most one `isMilestone` per poll batch per type |
| `@vercel/blob` not available in dev without Vercel infra | Medium | Guard upload route with env check, return 503 |
| Audio autoplay blocked in regular browser tabs | Low | Suppress errors silently; works natively in OBS |
| Orphaned Blob files when user replaces images | Low | Accept in V1; cleanup cron in V2 |
| Config stale until widget reconnect | Low | Acceptable for V1 |
| `batchRaidFollows` stored on `follow` row conflates global vs per-type | Low | Document clearly; migrate to `userAlertSettings` in V2 if needed |