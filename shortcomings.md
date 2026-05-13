# API Architecture Shortcomings

Review of `app/api/` against the project's software-architecture code style rules.

---

## 1. Controllers Are Not Thin

**Rule:** Keep controllers thin — receive input, call a service, return output. No business logic.

Business logic is embedded directly in route handlers across many files:

| File | Issue |
|---|---|
| `app/api/webhook/route.ts` | Large switch statement (~40 lines) with direct repository calls inside the route handler |
| `app/api/lemonSqueezy/webhook/route.ts` | Database writes, subscription state transitions inside the handler |
| `app/api/cron/youtube-poll/route.ts` | `pollAccount` function (~105 lines) defined and called inside the route module |
| `app/api/dev/seed-full/route.ts` | ~327-line POST handler containing all seeding logic |
| `app/api/connections/link/google/callback/route.ts` | OAuth token exchange, DB writes, redirect logic all in one handler (~82 lines) |
| `app/api/connections/link/spotify/callback/route.ts` | Same pattern as Google — ~72-line handler doing OAuth + DB work |
| `app/api/events/stream/route.ts` | Poll logic with repository calls inside `ReadableStream` start callback |
| `app/api/events/youtube-chat/route.ts` | Same SSE poll pattern — repository calls inline |
| `app/api/subs/route.ts` | Repository queries directly in handler with no service delegation |

**Fix:** Extract logic into services (or existing service layer in `src/services/`). Route handlers should be 10–20 lines max.

---

## 2. Silent Error Swallowing

**Rule:** Never swallow errors silently. Fail fast and explicitly.

Multiple catch blocks only call `console.error` and either continue, return a misleading success response, or redirect without surfacing the failure:

| File | Line(s) | Problem |
|---|---|---|
| `app/api/webhook/route.ts` | ~87–89 | Catches error, logs it, then still returns 200 |
| `app/api/lemonSqueezy/webhook/route.ts` | ~87–89 | Same pattern — handler failure returns success |
| `app/api/cron/youtube-poll/route.ts` | ~81 | `.catch(() => "(unreadable)")` silently discards parse errors |
| `app/api/dev/seed-full/route.ts` | ~85–87, ~123–125, ~181–183 | Multiple catch blocks that only add to result object, never fail the request |
| `app/api/connections/link/google/callback/route.ts` | ~83–85 | Catch only redirects, error not logged |
| `app/api/connections/link/spotify/callback/route.ts` | ~74–76 | Same — redirects on error without logging |
| `app/api/chat/stream/route.ts` | ~30–32 | Catch only logs, no recovery or client notification |
| `app/api/events/stream/route.ts` | ~34–36 | Catch logs "SSE poll error", stream continues silently |
| `app/api/events/youtube-chat/route.ts` | ~33–35 | Same SSE pattern |
| `app/api/spotify/controls/route.ts` | ~51–53 | Returns generic "Internal error" without logging details |

**Fix:** Either propagate errors as proper HTTP error responses, or close the SSE stream with an error event. Never return 2xx when an operation failed.

---

## 3. Missing Input Validation at the Boundary

**Rule:** Validate all input at the boundary (entry point), not deep inside business logic.

Request bodies and query params are destructured or cast without schema validation:

| File | Issue |
|---|---|
| `app/api/goals/route.ts` | `req.json()` destructured without checking shape |
| `app/api/goal/route.ts` | Validation inconsistent between GET and POST — `initialCount` has a floor, other fields do not |
| `app/api/feedback/route.ts` | Destructured from `req.json()` without existence checks; `2000` character limit is a magic number with no named constant |
| `app/api/subs/route.ts` | Multiple `??` fallbacks without a clear validation failure path |
| `app/api/spotify/controls/route.ts` | Cast to `{ action: Action; volume?: number }` with no schema check |
| `app/api/analytics/route.ts` | `range` query param cast and used without validation against allowed values |
| `app/api/lemonSqueezy/webhook/route.ts` | `subscriptionId` and `customerId` cast to `string` without existence checks |
| `app/api/connections/link/google/callback/route.ts` | State comparison done before userId is verified |

**Fix:** Use zod (already available in the project) to parse and validate all request input before any business logic runs.

---

## 4. Functions Exceeding Reasonable Size

**Rule:** Keep functions small and focused (aim for under 20–30 lines).

| File | Function / Scope | Approximate Lines |
|---|---|---|
| `app/api/dev/seed-full/route.ts` | `POST` handler | ~327 |
| `app/api/cron/youtube-poll/route.ts` | `pollAccount` | ~105 |
| `app/api/connections/link/google/callback/route.ts` | `GET` handler | ~82 |
| `app/api/connections/link/spotify/callback/route.ts` | `GET` handler | ~72 |
| `app/api/webhook/route.ts` | `POST` handler | ~80+ |
| `app/api/lemonSqueezy/webhook/route.ts` | `POST` handler | ~90+ |

**Fix:** Extract cohesive blocks into named functions or services. If a function needs "and" to describe it, split it.

---

## 5. Deep Nesting

**Rule:** Avoid deep nesting — more than 3 levels means extract a function or use an early return.

| File | Location | Pattern |
|---|---|---|
| `app/api/events/stream/route.ts` | `ReadableStream` start callback | 3+ levels: stream → try → if → repository call |
| `app/api/events/youtube-chat/route.ts` | Same pattern | 3+ levels |
| `app/api/cron/youtube-poll/route.ts` | Message processing loop | Triple-nested if-else for message type dispatch |
| `app/api/lemonSqueezy/webhook/route.ts` | Switch statement cases | Switch → case → try → if → DB call |
| `app/api/webhook/route.ts` | Main switch block | Switch → case → multiple nested conditions |
| `app/api/connections/link/google/callback/route.ts` | OAuth callback | Nested try-catch + conditionals |

**Fix:** Use guard clauses and early returns. Extract inner blocks to named functions.

---

## 6. Hardcoded Magic Numbers and Strings

**Rule:** Name things for what they *are*. Magic numbers without named constants make intent unclear.

| File | Value | Missing Constant |
|---|---|---|
| `app/api/events/stream/route.ts` | `3000`, `5 * 60 * 1000` | `POLL_INTERVAL_MS`, `INITIAL_LOOKBACK_MS` (defined per-file, not shared) |
| `app/api/events/youtube-chat/route.ts` | `5000`, `5 * 60 * 1000` | Same — duplicated from above |
| `app/api/analytics/route.ts` | `24 * 60 * 60 * 1000` | `ONE_DAY_MS` or similar |
| `app/api/feedback/route.ts` | `2000` (max message length) | `MAX_FEEDBACK_LENGTH` |
| `app/api/cron/youtube-poll/route.ts` | `maxResults=200` | `YOUTUBE_MAX_RESULTS` |
| `app/api/spotify/controls/route.ts` | `Math.max(0, Math.min(100, ...))` | `MIN_VOLUME`, `MAX_VOLUME` |
| `app/api/goals/route.ts` | `goal < 1` | `MIN_GOAL_VALUE` |

**Fix:** Extract to named constants in a shared config or at the top of the file.

---

## 7. Inconsistent Response Types

**Rule:** Consistent interfaces. Prefer small, focused patterns over ad-hoc variations.

`NextResponse`, `new Response`, and `Response.json()` are used interchangeably across the API surface with no consistent convention:

- `app/api/spotify/controls/route.ts` — returns `new Response(...)` while adjacent handlers use `NextResponse.json(...)`
- `app/api/connections/link/spotify/callback/route.ts` — mixes `NextResponse.redirect` and `new NextResponse`
- Some routes use `NextResponse.json({ error })` for errors, others use `new Response(JSON.stringify(...), { status: 400 })`

**Fix:** Establish a single response helper (e.g., `apiError(status, message)`) and use it consistently.

---

## 8. Single Responsibility Violations

**Rule:** Each module does one thing. If you need "and" to describe it, split it.

| File | Multiple Responsibilities |
|---|---|
| `app/api/cron/youtube-poll/route.ts` | Polls broadcasts **and** refreshes tokens **and** processes chat **and** handles super chats **and** handles member events |
| `app/api/connections/link/google/callback/route.ts` | Validates OAuth state **and** exchanges tokens **and** fetches profile **and** writes to DB **and** handles redirect |
| `app/api/webhook/route.ts` | Validates signature **and** dispatches events **and** processes follow/sub/bit/raid events directly |
| `app/api/dev/seed-full/route.ts` | Seeds followers **and** subscribers **and** bits **and** raids **and** chat messages **and** YouTube events |

**Fix:** For webhook dispatch, a handler-registry pattern (map of event type → handler function) keeps each handler to one responsibility. OAuth callbacks should delegate to an auth service.

---

## 9. Duplication

**Rule:** Don't repeat yourself, but don't over-abstract prematurely either.

- `POLL_INTERVAL_MS` and `INITIAL_LOOKBACK_MS` are defined independently in `events/stream/route.ts` and `events/youtube-chat/route.ts` with different values (`3000` vs `5000`, same lookback). This is likely intentional but undocumented.
- Token refresh logic exists separately in `cron/youtube-poll/route.ts` and presumably in `src/lib/spotify.ts` — no shared refresh abstraction.
- OAuth callback structure (state check → token exchange → profile fetch → DB upsert → redirect) is duplicated between Google and Spotify with minor variation.

---

## Summary

| Category | Files Affected |
|---|---|
| Business logic in route handlers | 9 |
| Silent error swallowing | 10 |
| Missing input validation | 8 |
| Functions > 30 lines | 6 |
| Deep nesting | 6 |
| Magic numbers / strings | 7 |
| Inconsistent response types | 3 |
| Single responsibility violations | 4 |
| Duplication | 3 |

The most impactful areas to address first are **input validation** (security boundary) and **silent error swallowing** (observability / correctness). Thinning the route handlers into proper service delegation would resolve most of the nesting and size issues as a downstream effect.
