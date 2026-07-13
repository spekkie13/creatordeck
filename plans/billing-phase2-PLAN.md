# Phase 2 — Runtime gates + degrade UI (spec §3.4/§3.5)

**Branch:** `billing-polar-migration` · **Spec:** `specs/Billing-Entitlements.md` · **Progress:** `plans/billing-polar-PROGRESS.md`
**Prereqs:** Phase 0/1 done, Gate 1 verified in prod against Polar sandbox (2026-07-13). Both DBs migrated.
**Planned:** 2026-07-13. This plan is teardown-first: Step 0 removes/corrects everything Phase 2 replaces before any new gate is added.

---

## 1. Spec vs. repo findings (verified 2026-07-13)

1. **`youtube-gate.ts` swap is not a pure body swap.** The progress doc says "swap the body to `hasPro(session.userId)`" — but `hasYouTubeAccess(session)` is **synchronous** and `hasPro` is async (DB read). All 4 call sites must change anyway, so the shim should be **deleted**, not swapped — spec criterion 5 ("`hasPro` is the only entitlement predicate, grep check") is better served with direct `hasPro`/`requirePro` calls. Call sites found:
   - `src/app/api/youtube/broadcast/route.ts:24` (403 JSON)
   - `src/app/api/youtube/chat/route.ts:34` (403 JSON)
   - `src/app/api/connections/link/google/start/route.ts:18` (redirect, not JSON — keep redirect semantics)
   - `src/app/connections/page.tsx:44` (async server component — can await `hasPro`)
2. **`src/app/live/page.tsx:62` passes `hasYouTube={!!ytAccount}` with no Pro check.** A lapsed user with a linked YT account still mounts `useYouTubeChat`, which polls `/api/youtube/broadcast` and gets 403s forever (the hook parses the error body as `{live: undefined}` → `not_live` → re-detect every 4 min). Harmless but violates §3.4 "polling and feed stop". Gate the prop server-side.
3. **`/api/connections/link/google/callback` has no Pro gate at all** (only the `start` route is gated). The signed state cookie (10-min TTL) makes abuse a narrow edge, but defense-in-depth says gate it too.
4. **`/api/events` has zero history clamp today.** `src/services/live-event-feed.service.ts:11` does `const since = from ?? new Date(0)` — Free users currently get **unlimited** history. The clamp must be added server-side in the route (spec §3.5: "server-side date clamp for Free").
5. **`/api/analytytics` already clamps — but to 7d, not 30d.** `src/app/api/analytics/route.ts:28` forces Free to `7d` when `30d`/`90d` is requested. Spec §2 gives Free **30 days** of history; analytics inheriting Pro applies to the *unlimited/extended* layer, not to shrinking Free below 30d. **Recommendation: clamp Free to `30d` (only `90d` is Pro).** Owner may confirm 7d as deliberate — flagged as open question Q2.
6. **Displayed pricing is stale vs. locked pricing.** `src/types/plan.ts` `PRO_PRICING` still says **€7.99/mo · €59/yr**, and `src/app/billing/pricing-cards.tsx:57` hardcodes "Save ~38%". Owner locked **€12.99/mo · €129.99/yr** (2026-07-13) and the Polar sandbox products charge that. The /billing page currently shows a price different from what checkout charges — must fix in Phase 2 Step 0 (yearly saving is ~17%: 129.99 vs 155.88).
7. **OBS-write / macros / conditional triggers / multi-profile do not exist in the repo** (confirmed: no trigger executor, no profiles model, widget routes are read-only goal overlays). Per the progress doc, Phase 2 only **scaffolds** `requireProForApiKey` in `src/lib/api-auth.ts` (+ widget-token variant in `src/lib/widget-auth.ts`) so those features are born gated. §3.5 rows 2–4 and 6 therefore cannot be *verified* at Gate 2 — they are verified when the features ship, using the scaffold.
8. **No test runner exists** (no vitest/jest in `package.json`). Gate 2 verification is manual; to make criteria 1–3 testable without waiting on Polar dunning, the plan adds a **dev-only entitlement override** (extends the existing `/api/dev/set-tier` + `/dev` toolbar pattern, `NODE_ENV !== "production"` guarded).
9. **UI kit:** no shadcn/component library — hand-rolled Tailwind (zinc palette, `rounded-xl` cards, teal-500 CTAs). `<ProLock>`/`<LockedPreview>` should follow that style; an existing locked-state precedent is `src/app/connections/youtube-connect.tsx` (🔒 Pro pill, `cursor-not-allowed`). Its tooltip copy "coming soon" is stale — becomes an upgrade CTA.
10. **Feature-flag system is orthogonal** (`src/app/api/{admin/,}feature-flags`, `src/hooks/use-feature-flags.ts`, `src/components/feature-flag.tsx`, `/features` page): admin-managed rollout flags with per-user overrides, no plan/billing semantics. Untouched.
11. **SWR 2.4.1 is already a dependency** — `useEntitlement()` can mirror `use-feature-flags.ts`.
12. **Dunning banner mount point:** `src/app/dashboard/app-header.tsx` is the shared chrome on every app page (dashboard/live/events/analytics/goals/billing/connections/account) — mount the banner there. `/api/me/entitlement` doesn't expose the grace deadline yet; extend it with `graceEndsAt` (derived `updatedAt + PAST_DUE_GRACE_MS` when status is `past_due`).
13. **Gate 1 trial-cancel note carries into Phase 2 UI:** trial-cancel keeps status `trialing` (+ Polar `cancel_at_period_end`); do NOT surface it as `canceled_active` and do NOT show the dunning banner for it. Banner triggers on stored `past_due` only.
14. **`requireTwitchSession` sessions include `userId`** (`src/types/next-auth.d.ts:5`) — the events-route clamp can call `hasPro(session.userId)` directly.

## 2. Teardown inventory (Step 0 — nothing new built on top of these)

| File | What it is today | Action |
|---|---|---|
| `src/lib/youtube-gate.ts` | Interim owner-only (`session.isAdmin`) YouTube gate; self-describes as "the single swap point" | **(a) Remove outright**; call sites go straight to `hasPro`/`requirePro` |
| `src/app/api/youtube/broadcast/route.ts` | Gates via `hasYouTubeAccess` | **(b) Refactor** → `requirePro` |
| `src/app/api/youtube/chat/route.ts` | Gates via `hasYouTubeAccess` | **(b) Refactor** → `requirePro` |
| `src/app/api/connections/link/google/start/route.ts` | Gates via `hasYouTubeAccess`, redirects | **(b) Refactor** → `hasPro` + redirect to `/billing` |
| `src/app/connections/page.tsx` | `youtubeLocked = !hasYouTubeAccess(session)` | **(b) Refactor** → `!(await hasPro(session.userId))` |
| `src/app/live/page.tsx` | `hasYouTube={!!ytAccount}` — ungated | **(b) Refactor** → AND with `hasPro` |
| `src/app/api/connections/link/google/callback/route.ts` | No Pro gate | **(b) Refactor** — add `hasPro` check (defense-in-depth) |
| `src/types/plan.ts` `PRO_PRICING` | Stale €7.99/€59 | **(b) Refactor** → €12.99/€129.99 |
| `src/app/billing/pricing-cards.tsx:57` | Hardcoded "Save ~38%" | **(b) Refactor** → "~17%" (or compute) |
| `src/app/connections/youtube-connect.tsx` | Locked pill says "coming soon" | **(b) Refactor** → upgrade CTA to `/billing` |
| `src/app/api/analytics/route.ts:28` | Free clamped to 7d | **(b) Refactor** → 30d (pending Q2) |
| `src/services/live-event-feed.service.ts` | `from ?? new Date(0)` (no cap) | **(c) Untouched** — clamp lives in the route (service stays plan-agnostic) |
| `src/app/api/dev/set-tier/route.ts` + `src/app/dev/dev-toolbar.tsx` | Dev-only `isAdmin` toggle | **(b) Extend** with entitlement-state presets (Step 5) |
| Feature-flag system (routes/hook/component/`/features` page) | Rollout flags, not billing | **(c) Untouched** |
| `src/lib/schema.ts` `subscriptionTier` enum + `users.tier` (nullable legacy) | Phase 0 leftover, documented | **(c) Untouched** (Phase 3+ cleanup) |
| Widget/API-key auth (`src/lib/{api-auth,widget-auth}.ts`) | Plain identity auth, no plan checks | **(b) Extend** with Pro variants (Step 3), existing exports unchanged |

Post-teardown grep check: `hasYouTubeAccess` and `youtube-gate` return zero hits; entitlement decisions grep to `hasPro|requirePro` only (plus admin-console `isAdmin` checks, which are role checks, not plan checks).

## 3. Ordered implementation steps

### Step 0 — Teardown & corrections (no new features)
1. Delete `src/lib/youtube-gate.ts`.
2. `src/app/api/youtube/broadcast/route.ts` and `src/app/api/youtube/chat/route.ts`: replace the `hasYouTubeAccess` import/check with
   `const gate = await requirePro(session.userId); if (gate) return gate` (placed right after `requireSession`, before the `youtubeChannelId` check). Response becomes `{error:"Pro required"}` 403 — `useYouTubeChat` already degrades to `not_live`/slow-detect on unknown bodies, and Step 4 stops Free users from mounting the hook at all.
3. `src/app/api/connections/link/google/start/route.ts`: `if (!(await hasPro(session.userId))) return NextResponse.redirect(new URL("/billing", APP_URL))` (redirect to billing, not connections — it's now an upgrade prompt, not a dead end).
4. `src/app/api/connections/link/google/callback/route.ts`: add the same `hasPro` redirect guard after session/state validation.
5. `src/app/connections/page.tsx`: `const youtubeLocked = !(await hasPro(session.userId))`; drop the youtube-gate import; update the stale "Interim Pro gate" comments.
6. `src/app/live/page.tsx`: `hasYouTube={!!ytAccount && await hasPro(session.userId)}` (compute alongside the existing parallel fetches) — §3.4 "polling and feed stop" for lapsed users.
7. Pricing correction: `src/types/plan.ts` → `monthly €12.99`, `yearly €129.99`; `src/app/billing/pricing-cards.tsx` yearly badge → "Save ~17%". (Blocked only on Q1 re-confirmation; the code must match Polar either way.)
8. Build + grep checks (see Gate 2 §A).

### Step 1 — Event-history clamp (>30d is Pro)
1. `src/lib/entitlement.ts`: add `export const FREE_HISTORY_DAYS = 30` (single source for route + UI copy).
2. `src/app/api/events/route.ts`: after parsing params, compute `isPro = await hasPro(session.userId)`. For Free: `const floor = new Date(Date.now() - FREE_HISTORY_DAYS*864e5)`; `from = (!from || from < floor) ? floor : from`; leave `to` alone (a `to` older than the floor now naturally yields an empty window). Pass a `clamped: boolean` (true when the floor moved/created `from`) through to the response.
3. `src/types/event-filter.ts`: add optional `clamped?: boolean` to `PaginatedEvents` (route sets it on the service result; service untouched).
4. `src/app/api/analytics/route.ts`: change the Free clamp from `7d` to `30d` — i.e. only `range === "90d"` downgrades (to `"30d"`) for Free (pending Q2).
5. NOT gated (confirmed Free features): `/api/events/stream` (live SSE), `/api/events/replay` (re-fires an event the user can already see), `/api/widget/*` (goal overlays), `/api/analytics/[sessionId]` (session detail within visible history).

### Step 2 — Entitlement endpoint + client hook
1. `src/app/api/me/entitlement/route.ts`: extend the JSON with
   - `graceEndsAt`: `ent.status === "past_due" ? new Date(ent.updatedAt.getTime() + PAST_DUE_GRACE_MS) : null` (import from `src/lib/entitlement.ts`),
   - keep existing `isPro/plan/status/trialEndsAt/currentPeriodEnd` shape (the success-page poll depends on `isPro`).
2. New `src/hooks/use-entitlement.ts` (mirrors `use-feature-flags.ts`): SWR on `/api/me/entitlement`, `revalidateOnFocus: true`, modest `refreshInterval` (60s). Returns `{ isPro, status, trialEndsAt, currentPeriodEnd, graceEndsAt, isLoading }`. This — not `useSession()` — is the client source of paid state (JWT is a stale cache, see `src/lib/require-pro.ts` docblock).

### Step 3 — Scaffold `requireProForApiKey` (future OBS-write / macros / profiles)
1. `src/lib/api-auth.ts`: add
   `export async function requireProForApiKey(req: NextRequest): Promise<{ user: User } | NextResponse>` — composes `validateApiKey(req)` then `requirePro(user.id)` (401 invalid key / 403 not Pro / `{user}`). Docblock: this is the mandatory guard for every future **write/act** desktop-app route (OBS scene/source/volume, macro dispatch, profile create/switch — spec §3.5 rows 2–4, 6); read-only routes keep `validateApiKey`.
2. `src/lib/widget-auth.ts`: matching `requireProForWidgetToken(req)` for any future Pro widget surface. Both are exported-but-unused until those features ship — note that in the docblock so a dead-code sweep doesn't remove them.
3. No routes change in this step (nothing to attach them to yet — finding 7).

### Step 4 — Degrade UI (§3.4 visible-but-locked)
1. New `src/components/pro-lock.tsx` (client), house Tailwind style:
   - `<ProLock title? description? children?>` — lock badge + short pitch + "Upgrade to Pro" CTA (`<Link href="/billing">`), for inline/row placements.
   - `<LockedPreview>{preview}</LockedPreview>` — wraps a greyed/`pointer-events-none` preview with an overlay CTA (features render locked with previews, never hidden).
   - Export both from `src/components/index.ts`.
2. New `src/components/dunning-banner.tsx` (client): uses `useEntitlement()`; renders only when `status === "past_due"`: amber banner "Your last payment failed — update your payment method to keep Pro" + button → `/api/portal`; if `graceEndsAt` is future, show "Pro access ends <date>". Mount at the top of `src/app/dashboard/app-header.tsx` render output (single mount point covers every app page). Not shown for trial-cancel (finding 13).
3. `src/app/events/events-client.tsx`: consume `useEntitlement()`. For Free: cap the native date inputs (`min` = today−30d) and render a compact `<ProLock>` note in the Filters card ("History older than 30 days is a Pro feature"); when a response comes back `clamped: true`, show the same notice above the table. Server clamp from Step 1 remains the enforcement; this is UX only.
4. `src/app/analytics/analytics-client.tsx`: lock the `90d` range chip for Free (lock icon + tooltip via `<ProLock>` affordance, chip disabled) instead of letting the server silently downgrade.
5. `src/app/connections/youtube-connect.tsx`: locked state becomes an upgrade CTA — 🔒 "Pro" pill links to `/billing` with title "YouTube is a Pro feature — upgrade to connect" (replaces "coming soon"). Connections page YouTube row keeps rendering when locked (§3.4: connection row preserved, locked state on the card).
6. `src/app/live/live-client.tsx`: no change needed — with the Step 0.6 gated prop, `hasYouTube=false` renders the existing Twitch-only layout.

### Step 5 — Dev verification aids (dev-only, `NODE_ENV !== "production"`)
1. `src/app/api/dev/set-tier/route.ts`: accept an optional `entitlement` preset alongside `isAdmin` and upsert the caller's `entitlements` row via `db`:
   `free` (free/none, nulls), `trialing` (pro/trialing, trialEndsAt +14d), `trial_lapsed` (trialEndsAt −1d), `active`, `canceled_active` (currentPeriodEnd +20d), `past_due` (updatedAt now → in grace), `past_due_lapsed` (updatedAt −4d → grace over), `revoked`.
2. `src/app/dev/dev-toolbar.tsx`: buttons for those presets (current `Free`/`Pro (owner)` isAdmin toggle stays).
3. These exist solely to walk Gate 2 §B–D without waiting on Polar dunning timers; sandbox webhook flows remain the authoritative test for state *transitions*.

### Step 6 — Build, grep, and Gate 2 run
`npm run build` green; grep checks below; manual checklist below. No DB schema changes anywhere in Phase 2 (no drizzle migration needed).

## 4. Gate 2 verification checklist (spec criteria 1–3, 5–7 scoped to built features)

**A. Grep/static (criterion 5)**
- [ ] `grep -rn "hasYouTubeAccess\|youtube-gate" src` → 0 hits.
- [ ] `grep -rn "hasPro\|requirePro" src` → only `src/lib/{require-pro,entitlement,api-auth,widget-auth}.ts`, the gated routes/pages above, `/api/me/entitlement`, billing pages. No other predicate (`tier`, `plan ===`, `isAdmin` outside admin console/dev tools) decides paid access.
- [ ] Owner bypass: `isAdmin=true` user with zero Polar rows passes every gate (dev toolbar).

**B. YouTube gates (criterion 6, Free account / lapsed preset)**
- [ ] `GET /api/youtube/broadcast` and `/api/youtube/chat` → 403 `Pro required`.
- [ ] `GET /api/connections/link/google/start` (and `/callback`) → redirect to `/billing`, no Google OAuth initiated.
- [ ] `/connections`: YouTube row visible, locked pill links to `/billing`; existing linked account row preserved (not deleted); no Google token calls made while locked (the `youtubeNeedsReconnect` probe is skipped).
- [ ] `/live` as Free with a linked YT account: no requests to `/api/youtube/*` at all (network tab), Twitch-only layout.
- [ ] Upgrade (sandbox checkout) → YouTube works again with the same preserved connection, no reconnect needed (instant restore).

**C. History clamp (criterion 6)**
- [ ] Free + `GET /api/events?from=<45d ago>` (curl, bypassing UI) → results only within 30d, `clamped: true`.
- [ ] Free `/events` UI: date picker capped, Pro-lock notice shown; Pro sees full history including >30d rows (data was never deleted).
- [ ] Free `GET /api/analytics?range=90d` → served as 30d (per Q2 resolution); `90d` chip locked in UI.

**D. Lifecycle & degrade (criteria 1–3, 7)**
- [ ] Trial-lapse preset → locked-with-preview states everywhere (§B/§C), automations N/A (not built), no data deleted.
- [ ] `past_due` preset → dunning banner on every app page, Pro still granted (grace); `past_due_lapsed` → banner logic per design, Pro gone, degrade identical to revoked.
- [ ] Sandbox out-of-order/replay re-check (regression from Gate 1): re-delivered webhook → `{duplicate:true}`; canceled→updated out-of-order converges (absolute-state handlers).
- [ ] Success-page race still resolves ("activating…" poll unchanged by the `/api/me/entitlement` extension).
- [ ] Free walkthrough (criterion 7): dashboard, live (Twitch+Spotify), events ≤30d, analytics ≤30d, goals, widgets, single profile — fully functional, zero Pro nags outside the natural gate encounters above.
- [ ] Cancel-during-trial (Gate 1 semantics): stays `trialing`, no dunning banner, access self-expires at `trialEndsAt`.

**E. Out of Gate 2 scope (deferred to feature delivery, guard already scaffolded)**
- §3.5 rows 2–4, 6 (conditional triggers, macros, OBS write, profiles>1) — verify via `requireProForApiKey` when those features are built. Criterion 1's full journey pieces that depend on them are likewise deferred; criterion 8 is Phase 3.

## 5. Open questions for the owner
1. **Q1 — Pricing display fix:** confirm the UI should show €12.99/mo · €129.99/yr ("Save ~17%") to match the locked pricing and the actual Polar products (currently the /billing page shows the old €7.99/€59).
2. **Q2 — Free analytics window:** spec §2 gives Free 30-day history; the analytics route currently clamps Free to 7d. Plan assumes aligning to 30d (only 90d is Pro). Confirm, or declare 7d-analytics a deliberate stricter tier line.
3. **Q3 — Trial-status UI (optional, not in Phase 2 scope):** should the billing page show "Trial — ends <date>" / "Cancels at period end"? `/api/me/entitlement` will already return the data; purely a copy decision.

## 6. Coordination note (YouTube workstream, worktree 1)
The YouTube plan consumes — never reimplements — the guard interface this phase finalizes: `hasPro(userId)` / `requirePro(userId)` from `src/lib/require-pro.ts`, replacing the interim `hasYouTubeAccess`. Any new YouTube route or UI surface that workstream adds must call `requirePro` (server) / `useEntitlement().isPro` (client). YouTube ingestion/connection internals are out of scope here.
