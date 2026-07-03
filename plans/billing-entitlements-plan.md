# Implementation Plan: Billing & Entitlements — Polar.sh Pro tier

**Source spec:** `specs/Billing-Entitlements.md`
**Repo:** `/Users/tomspek/Documents/GitHub/creatordeck-migration` (Next.js App Router on Vercel, Drizzle ORM on Neon, next-auth 4.24.x)
**Status:** Plan for Gate 0 review. This document is planning only — no source code has been modified.

---

## 1. Spec vs. Repo findings

### 1.1 ORM: spec says Prisma, repo is Drizzle on Neon — spec is wrong about the stack
- Repo uses **drizzle-orm 0.45.2** + **@neondatabase/serverless 1.0.2**. Schema is a single file `src/lib/schema.ts`; SQL migrations live in `drizzle/` (currently one file, `0000_abandoned_sprite.sql`, journal at `drizzle/meta/_journal.json`).
- Workflow convention: `npm run db:generate` (drizzle-kit generate) then `npm run db:push` / `db:push:prod` (two configs: `drizzle.config.ts` → `DATABASE_URL`, `drizzle.config.prod.ts` → `DATABASE_URL_PROD`).
- The spec's `model Entitlement` / `model WebhookEvent` Prisma blocks are translated to Drizzle `pgTable` definitions in §3 below (snake_case columns, `uuid` PK with `defaultRandom()`, matching existing conventions). The spec's Gate 0 wording "Prisma conventions" should be read as "Drizzle conventions".

### 1.2 Payment provider: repo has a full Lemon Squeezy integration; Polar is not installed
- `@lemonsqueezy/lemonsqueezy.js@4.0.0` is a dependency; `@polar-sh/nextjs` is **not**. Phase 1 adds `@polar-sh/nextjs` (and `@polar-sh/sdk` if the adapter needs direct API calls).
- A complete LS billing stack exists: checkout/portal/webhook routes, a `BillingService`, variant→tier mapping, 9 `LEMONSQUEEZY_*` env vars, and `lemon_squeezy_customer_id` / `lemon_squeezy_subscription_id` columns on `users`. All of it is teardown scope (full inventory in §2).
- Existing route paths (`POST /api/billing/checkout`, `POST /api/billing/portal`, `POST /api/billing/webhook`) do **not** match the spec's mandated paths (`GET /api/checkout`, `GET /api/portal`, `POST /api/webhooks/polar`). The spec paths win; old routes are deleted, new ones created (App Router confirmed — everything is under `src/app/`, no Pages Router anywhere).

### 1.3 Tier model: repo has a 4-tier system that contradicts the spec's binary Free/Pro
- Repo: `pgEnum subscription_tier ("free"|"tier1"|"tier2"|"tier3")`, `users.tier` column, a `Tier` rank class (`src/types/tier.ts`), `hasAccess(userTier, requiredTier)` + a `GATES` registry (`src/lib/gates.ts`), and tier feature copy (`src/constants/billing.ts`) with prices in USD ($4.99/$11.99/$19.99) billed "via Lemon Squeezy".
- Spec §2 is locked: **free | pro only**, EUR pricing, different feature split. The entire tier1/2/3 apparatus (enum, class, GATES registry, TIER_FEATURES, 4-card pricing UI, per-tier waitlist modal) is torn down and replaced. Existing `GATES` entries (`analyticsRange30d: tier1`, `customAlerts: tier2`, `aiAnalysis: tier3`, …) describe features that mostly don't exist; none survive as-is.
- Divergence worth flagging: current code caps **free analytics at 7 days** (`src/app/api/analytics/route.ts` clamps 30d/90d → 7d) and the free-tier marketing copy says "7-day event history". Spec §2 says free gets **30 days**. Spec wins: free clamp becomes 30 days (a free-tier *improvement*).

### 1.4 Auth / session shape (Gate 0 open question #1: where does `isOwner` live?)
- next-auth 4.24.13, **JWT session strategy**, Twitch + Google providers. Session shape (augmented in `src/types/next-auth.d.ts`, populated in `src/lib/auth.ts` callbacks): `userId`, `twitchId`, `youtubeChannelId`, `displayName`, `apiKey`, `tier`, `isAdmin`, `linkingError?`.
- `users.is_admin` already exists and is plumbed through JWT → session; it gates the feature-flag admin console (`/admin`, `/api/admin/*`). **Decision: do not overload `isAdmin`.** Admin (ops console powers) and owner/comped-Pro are orthogonal; add a new `users.is_owner` boolean column, defaulting false, set manually via SQL for the owner and any comped accounts. This matches the spec's "user-table boolean" option; no env allowlist needed.
- **Critical consequence of JWT sessions:** entitlement state must NOT live in the JWT. The current `session.tier` only refreshes on an explicit `update()` call (the LS success page does exactly this "reload gymnastics" the spec forbids). The plan makes `hasPro` read the `entitlements` row from Neon per gated request (server) and via SWR polling of `GET /api/me/entitlement` (client). This satisfies "never call Polar on the hot path" (it's our DB, not Polar) and makes webhook-driven changes visible within seconds without token refresh. `tier` is removed from the JWT/session types entirely.
- Bonus cleanup: `src/types/next-auth.d.ts` imports `SubscriptionTier` from `@/lib/gates`, which never exports it (it's defined in `src/types/tier.ts`) — a latent type bug that disappears with the teardown.

### 1.5 Trigger/automation execution (Gate 0 open question #2): it does not exist in this repo
- Exhaustive grep for trigger/macro/automation/OBS/profile/preset: **there is no trigger executor, no macro engine, no OBS write path, no chat-command engine, and no profiles/presets feature anywhere in the webapp.** The only OBS references are marketing copy ("OBS overlay — coming soon" on `/features`) and browser-source widget pages (`/widget/*`), which are read-only overlays.
- Conclusion for the spec: execution of triggers/macros/OBS actions lives (or will live) in the **external C# desktop app**, which is not in this repository. The desktop app authenticates against this webapp with an API key (`src/lib/api-auth.ts`, `x-api-key` header → `users.api_key`).
- **Design decision for the runtime gate (settling the spec's design point):** the webapp is the entitlement authority. `GET /api/me/entitlement` will accept *both* session auth and `x-api-key` auth, returning `{ plan, status, effectiveStatus, hasPro, trialEndsAt, currentPeriodEnd, graceEndsAt }`. The desktop app must fetch this with its config, cache it briefly (minutes, not hours), and skip Pro-only actions (conditional triggers, multi-action macros, OBS writes) when `hasPro` is false. Any *future* webapp API route that dispatches or proxies an OBS write must call `requirePro` and return 403. This is the contract the spec's §3.5 runtime rows enforce; the desktop-side implementation is outside this repo and this plan.
- **Honest scope note:** spec §3.5 rows "conditional-logic trigger execution", "multi-action macro execution", "OBS write actions", and "profile count > 1" have **no existing enforcement point in this repo** because the features don't exist here yet. This plan delivers the guard (`hasPro`/`requirePro`), the entitlement signal endpoint, and the degrade semantics contract — full verification of those rows (acceptance criterion 6) is blocked on the features landing (desktop app / future workstreams). This is a spec assumption the repo contradicts; it is recorded, not silently reinterpreted.

### 1.6 UI kit for locked-state components (Gate 0 open question #3)
- No component library (no shadcn/radix/etc.) — hand-rolled Tailwind CSS 3.4 components with dark mode via `next-themes`. Reusable patterns that exist today: `UpgradeModal` (`src/app/billing/upgrade-modal.tsx`), `CurrentPlanBadge`, `FeatureRow` with a `comingSoon` state (`/features` page), `FeatureFlag` render-gate component (`src/components/feature-flag.tsx`), barrel export in `src/components/index.ts`.
- Decision: build a small Pro-lock kit in `src/components/` following these patterns (see Phase 2): `ProBadge`, `ProGate` (client wrapper: renders children when `hasPro`, else a locked preview + upgrade CTA), `LockedCard`, `DunningBanner`. The existing `UpgradeModal` is refactored from tier-parametric to Pro-only.

### 1.7 Other repo facts the spec should know
- **Event history gate is currently missing entirely:** `GET /api/events` (`src/app/api/events/route.ts`) accepts arbitrary `from`/`to` with no date clamp. The §3.5 "history >30d" gate is a *new* server-side clamp there plus a re-map of the analytics clamp.
- **Trial infrastructure does not exist** — no `trialEndsAt` anywhere. User creation happens in `linkedAccountsRepository.upsertWithUser` (`src/repositories/linked-accounts.repository.ts`); that is where the trial-bearing entitlement row will be created.
- **No test infrastructure** (no vitest/jest, no `test` script). Criteria 2 and 5 want mechanical verification; Phase 1 adds a minimal vitest setup for pure-function and service-level tests (small, isolated addition — flagged in open questions in case the owner objects).
- **Success page** (`src/app/billing/success/page.tsx`) currently calls `useSession().update()` — replaced with the spec's poll-our-own-API pattern.
- **Waitlist:** homepage waitlist form is product-access framing (fine). The billing page runs `waitlistMode={true}` with a per-paid-tier `WaitlistModal` writing `interestedTier` — that is a **paid waitlist and violates Polar AUP per spec §4**; it is removed. The `waitlist.interested_tier` column stays (historical data), just stops being written.
- **Out-of-order webhooks:** the spec's model has no field to detect stale events. "Set state from full payload" alone does not survive a genuinely late-arriving older `subscription.updated` after a `canceled`. The plan adds one column beyond the spec's model — `entitlements.last_event_at` — and skips events whose payload timestamp is older. Deliberate, minimal extension needed to actually pass acceptance criterion 2.
- **Grace window:** `past_due_grace` in the spec's `hasPro` is a *derived* status. Polar marks a subscription `past_due` when renewal fails at period end, so the 3-day grace anchors on `current_period_end + 3d` — no extra column needed.
- `shortcomings.md` references stale paths (`app/api/lemonSqueezy/webhook`, `app/api/cron/youtube-poll`, `app/api/dev/seed-full`) that no longer exist — informational only, no action.
- Untouched look-alikes (to prevent over-eager teardown): `POST /api/webhook` is the **Twitch EventSub** webhook; `/api/register-subscriptions` registers **EventSub** subscriptions; "Spotify Premium" strings in `/api/spotify/controls` are Spotify's product, not ours; `sub_events.tier` / `event.tier` are **Twitch sub tiers** (1000/2000/3000); the feature-flag system (`feature_flags` tables, `/admin`) is ops tooling and stays — with an explicit rule that feature flags must never be used as a plan gate.

---

## 2. Teardown inventory (Phase 0 scope)

Legend: **(a)** removed outright · **(b)** refactored to fit the spec · **(c)** untouched.

### Lemon Squeezy integration
| File / item | What it does | Fate |
|---|---|---|
| `package.json` → `@lemonsqueezy/lemonsqueezy.js@4.0.0` | LS SDK dependency | (a) uninstall |
| `src/lib/lemon-squeezy.ts` | `configureLemonSqueezy()` SDK setup | (a) |
| `src/services/billing.service.ts` | LS webhook business logic (checkout completed / sub updated / deleted → sets `users.tier`) | (a) — replaced by `entitlements.service.ts` |
| `src/services/index.ts` | exports `billingService` | (b) remove the export |
| `src/app/api/billing/checkout/route.ts` | `POST` creates LS checkout (passes `user_id` in `custom` — the LS analogue of `externalCustomerId`) | (a) — replaced by `GET /api/checkout` |
| `src/app/api/billing/portal/route.ts` | `POST` fetches LS customer-portal URL | (a) — replaced by `GET /api/portal` |
| `src/app/api/billing/webhook/route.ts` | LS HMAC verify + event switch; **no idempotency ledger, no out-of-order handling** | (a) — replaced by `POST /api/webhooks/polar` |
| `src/lib/schemas/stripe.schema.ts` | Misnamed zod schemas for LS payloads; **dead code, zero imports** | (a) |
| `src/lib/exceptions.ts` → `UnknownVariantException`, `NoCustomerFoundException` | LS-specific errors | (b) delete `UnknownVariantException`; keep `NoCustomerFoundException` for the Polar customer-resolution failure path |
| `src/lib/env.ts` → `lemonSqueezyApiKey/WebhookSecret/StoreId/Variants` (9 vars) | env plumbing | (b) replace with `POLAR_*` entries |
| `.env.example` lines 14–22 (`LEMONSQUEEZY_*`) | env documentation | (b) replace with `POLAR_*`; also delete the vars from Vercel project settings (manual step) |

### Tier system & DB
| File / item | What it does | Fate |
|---|---|---|
| `src/lib/schema.ts` → `subscriptionTier` pgEnum; `users.tier`, `users.LsCustomerId`, `users.LsSubscriptionId` | 4-tier enum + LS columns on users | (a) drop via migration (§3.2); enum type dropped after column |
| `src/types/tier.ts` | `Tier` rank class, `SubscriptionTier`, USD prices | (a) |
| `src/lib/gates.ts` | `buildVariantTierMap`, `hasAccess`, `GATES` registry | (a) — replaced by `src/lib/entitlements.ts` (`hasPro`/`requirePro`) |
| `src/constants/billing.ts` | `TIER_FEATURES` copy (4 tiers), `BillingCycle` | (b) rewrite as Free/Pro feature matrix matching spec §2 exactly; keep `BillingCycle` |
| `src/types/billing-info.ts` | `BillingInfo` (LS ids + tier) | (a) |
| `src/repositories/user.repository.ts` → `getTier`, `setTier`, `setCustomer`, `clearSubscription`, `findByCustomerId`, `getCustomerInfo` | tier/LS-customer accessors | (a) those methods — replaced by `entitlements.repository.ts`; rest of the repository (c) |
| `src/repositories/linked-accounts.repository.ts` → `upsertWithUser` returns `tier`; `upsertForUser` join selects tier | signup path | (b) stop returning tier; create entitlement row on user creation (trial start) |
| `src/lib/auth.ts` → `token.tier` / `session.tier` plumbing (3 sites + session callback) | tier in JWT | (b) remove tier; keep `isAdmin`; leave the rest of the OAuth linking logic alone |
| `src/types/next-auth.d.ts` → `tier: SubscriptionTier` (+ broken import from `@/lib/gates`) | session typing | (b) remove `tier`, fix import fallout |

### Plan checks / gating call sites
| File / item | What it does | Fate |
|---|---|---|
| `src/app/api/analytics/route.ts:27` | clamps 30d/90d → 7d for `!hasAccess(tier, "tier1")` | (b) becomes: `!hasPro` clamps to ≤30d (spec free tier = 30 days) |
| `src/app/analytics/page.tsx` (`hasAccess(session.tier, "tier1")`, passes `tier` to client) | UI-side extended-history flag | (b) switch to entitlement fetch; locked-state UI for >30d ranges |
| `src/app/analytics/analytics-client.tsx` (+ `src/props/analytics-client.props.ts`) | client-side `GATED_RANGES` check → opens `UpgradeModal` with `requiredTier="tier1"` | (b) re-point at `hasPro` (free gets 7d/30d, Pro gets 90d); Pro-only `UpgradeModal`; drop `tier` prop |
| `src/app/api/events/route.ts` | history query, **no date clamp at all** | (b) add server-side clamp: Free ⇒ `from >= now-30d` forced |
| `src/app/api/dev/set-tier/route.ts` + `src/app/dev/dev-toolbar.tsx` | dev-only tier switcher | (b) rebuild as entitlement-state switcher (free / trialing / active / canceled_active / past_due / revoked + trial-lapse simulation) — this is the tool that drives acceptance-criteria 1 & 3 simulations |

### Billing / pricing UI
| File / item | What it does | Fate |
|---|---|---|
| `src/app/billing/page.tsx` | 4-tier pricing page, `waitlistMode=true`, "Billed via Lemon Squeezy" | (b) rebuild: current-plan card (status, trial/period dates, portal link) + Free-vs-Pro upgrade cards |
| `src/app/billing/pricing-cards.tsx` | 4 tier cards, monthly/annual toggle, LS checkout POST | (b) rebuild: 2 cards (Free/Pro), monthly/yearly toggle, links to `GET /api/checkout?products=…` |
| `src/app/billing/waitlist-modal.tsx` | **paid-tier waitlist** (`interestedTier`) | (a) — violates Polar AUP framing per spec §4 |
| `src/app/billing/upgrade-modal.tsx` | tier-parametric upgrade modal with `TIER_PERKS` | (b) refactor to Pro-only upgrade modal (reused by ProGate) |
| `src/app/billing/success/page.tsx` | `update()` session then redirect | (b) rebuild: poll `GET /api/me/entitlement` ("activating…"), success on `hasPro`, timeout → soft error |
| `src/app/billing/{spinner,feature,current-plan-badge}.tsx` | presentational bits | (c) reuse |
| `src/props/pricing-card.props.ts` | props incl. LS `variants` map | (b) rewrite for Free/Pro |
| `src/app/account/page.tsx:30` | shows `Tier` label from session | (b) show plan/status from entitlement |
| `src/components/index.ts` | exports upgrade/waitlist modals | (b) update exports |
| `src/app/dashboard/app-header.tsx` ("Billing" nav link) | nav | (c) link stays; (b) add `DunningBanner` slot |

### Untouched (verified look-alikes)
| Item | Why untouched |
|---|---|
| `src/app/api/webhook/route.ts`, `src/services/twitch-webhook.service.ts`, `/api/register-subscriptions`, `eventsub_subscriptions` table | Twitch EventSub, not billing |
| `sub_events.tier`, `TWITCH_TIER_LABEL`, `event.tier` in mappers/alerts/event-detail-modal | Twitch subscription tiers (1000/2000/3000) |
| `/api/spotify/controls` "Spotify Premium required" | Spotify's product |
| Feature-flag system (`feature_flags*` tables, `/admin`, `/features` page, `FeatureFlag` component) | Ops tooling, orthogonal to entitlements. Rule going forward: never a plan gate |
| Homepage waitlist (`src/app/waitlist-form.tsx`, `/api/waitlist`, `waitlist` table) | Free product-access waitlist — allowed framing; only stops receiving `interestedTier` |
| `shortcomings.md` stale route references | documentation of a past state |

---

## 3. Phased implementation plan

### Phase 0 — Teardown (pre-req for spec Phase 1; nothing new built on leftovers)

1. **Delete/refactor code** exactly per the §2 inventory tables (fates a/b). Order: UI call sites → routes/services → lib/types → repositories → auth plumbing, keeping the tree compiling at each step (temporary `hasPro = () => false` stub in `src/lib/entitlements.ts` lets gated call sites migrate before Phase 1 fills it in).
2. **Migration 0001 (generated via `npm run db:generate`):**
   - `ALTER TABLE users DROP COLUMN tier, DROP COLUMN lemon_squeezy_customer_id, DROP COLUMN lemon_squeezy_subscription_id;`
   - `DROP TYPE subscription_tier;`
   - `ALTER TABLE users ADD COLUMN is_owner boolean NOT NULL DEFAULT false;`
   (Drizzle generates this from editing `src/lib/schema.ts`; new tables ride in the same migration — see Phase 1 — so 0001 can be a single migration for the whole schema delta.)
3. **Env teardown:** remove `LEMONSQUEEZY_*` from `src/lib/env.ts` and `.env.example`; manual: delete from Vercel + `.env.local`.
4. **Uninstall** `@lemonsqueezy/lemonsqueezy.js`.
5. Exit check: `grep -ri "lemonsqueezy\|lemon.squeezy\|hasAccess\|GATES\|subscription_tier\|SubscriptionTier" src` returns nothing; `next build` passes.

### Phase 1 — Foundation (spec §6 Phase 1)

**Polar side (manual, owner + Claude Code together):** sandbox org; products `pro-monthly` (€7.99/mo) and `pro-yearly` (€59/yr) — placeholder prices pending owner confirmation — both carrying benefit "CreatorDeck Pro"; webhook endpoint pointed at the deployed `/api/webhooks/polar`; verify at Gate 1 whether no-card trials are configurable (spec risk item).

**Schema (`src/lib/schema.ts`, same migration 0001):**
```ts
export const entitlements = pgTable("entitlements", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  plan: text("plan").notNull().default("free"),        // "free" | "pro"
  status: text("status").notNull().default("none"),    // none|trialing|active|canceled_active|past_due|revoked
  polarCustomerId: text("polar_customer_id").unique(),
  polarSubscriptionId: text("polar_subscription_id").unique(),
  currentPeriodEnd: timestamp("current_period_end"),
  trialEndsAt: timestamp("trial_ends_at"),
  lastEventAt: timestamp("last_event_at"),             // out-of-order guard (§1.7)
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

export const polarWebhookEvents = pgTable("polar_webhook_events", {
  id: text("id").primaryKey(),                         // Polar event id
  type: text("type").notNull(),
  processedAt: timestamp("processed_at").defaultNow().notNull(),
})
```
(Table named `polar_webhook_events`, not the spec's generic `WebhookEvent`, to avoid confusion with Twitch EventSub — naming-level deviation only.) Add both types to `src/types/entities.ts`.

**New files:**
- `src/repositories/entitlements.repository.ts` (+ barrel export): `getByUserId`, `getOrCreate(userId)` (lazy default row — covers legacy users without a backfill), `createTrial(userId)` (status `trialing`, `trialEndsAt = now + 14d`; **never overwrites an existing `trialEndsAt`** — one trial per user, ever), `applyWebhookState(...)` (absolute-state write guarded by `lastEventAt`), `findByPolarCustomerId`.
- `src/lib/entitlements.ts` — the single gate:
  - `effectiveStatus(ent)`: maps stored status + clock → adds `past_due_grace` when `status === "past_due" && now < currentPeriodEnd + 3d`.
  - `hasPro({ isOwner, ent })`: exactly the spec §3.2 predicate (owner → true; live trial → true; `["active","canceled_active","past_due_grace"].includes(effectiveStatus)`).
  - `requirePro()`: server guard in the house style of `src/lib/session-auth.ts` — resolves session (`getServerSession`), loads `users.is_owner` + entitlement in one query, returns `NextResponse 401/403` or `{ session, entitlement }`. Variant `requireProApiKey(req)` layered on `validateApiKey` for desktop-app calls.
  - **Grep-ability rule:** `hasPro` is called only here and by `requirePro`; every gate imports from this module. No other plan predicate may exist (acceptance criterion 5).
- `src/services/entitlements.service.ts` — webhook application logic: payload → `{status, plan, currentPeriodEnd, polarCustomerId, polarSubscriptionId}` mapping; status mapping from Polar subscription states: `active`→`active`, `active + cancel_at_period_end`→`canceled_active`, `past_due`→`past_due`, `canceled/revoked`→`revoked` (plan stays recorded, access decided by `hasPro`), Polar `trialing`→`trialing`. Absolute writes only, never relative toggles.
- `src/app/api/checkout/route.ts` — `GET`, thin wrapper around the `@polar-sh/nextjs` `Checkout` adapter: requires session first, then injects `externalCustomerId = session.userId` (and customer email if available) server-side — never trusted from the query string; `?products=` selects monthly/yearly; success URL `/billing/success`.
- `src/app/api/portal/route.ts` — `GET`, `CustomerPortal` adapter; `getCustomerId` resolves via `entitlements.polarCustomerId` (fallback: Polar external-customer lookup — confirm adapter capability at Gate 1); 400 if no customer yet.
- `src/app/api/webhooks/polar/route.ts` — `POST`, `Webhooks` adapter (`POLAR_WEBHOOK_SECRET`; adapter handles signature verification — confirm at Gate 1 per spec §3.3). `onPayload`: (1) `INSERT … ON CONFLICT DO NOTHING` event id into `polar_webhook_events`; if conflict → ack 200, skip (idempotency); (2) skip if payload timestamp < `entitlements.last_event_at` (out-of-order); (3) resolve user via `externalCustomerId` (fallback `polarCustomerId`); (4) `applyWebhookState`. Events subscribed: `subscription.created/updated/active/canceled/revoked` (+ `checkout.updated`/`order.*` only if needed for the success page — decide at Gate 1).
- `src/app/api/me/entitlement/route.ts` — `GET`; auth = session **or** `x-api-key`; returns `{ plan, status, effectiveStatus, hasPro, trialEndsAt, currentPeriodEnd, graceEndsAt }`. This is both the success-page poll target and the desktop app's runtime entitlement signal (§1.5).
- `src/hooks/use-entitlement.ts` — SWR hook on `/api/me/entitlement` (repo already uses SWR) for all client-side gating.

**Trial + owner wiring:** `linkedAccountsRepository.upsertWithUser` calls `entitlementsRepository.createTrial(newUserId)` inside the same flow; owner flips `is_owner` via one-off SQL. Existing users: covered lazily by `getOrCreate` (default `plan=free,status=none`, no trial) — whether legacy users get a courtesy trial is an owner question (§ Open questions).

**Env (`src/lib/env.ts` + `.env.example` + Vercel):** `POLAR_ACCESS_TOKEN`, `POLAR_WEBHOOK_SECRET`, `POLAR_PRODUCT_PRO_MONTHLY`, `POLAR_PRODUCT_PRO_YEARLY`, `POLAR_SERVER` (`sandbox`|`production`).

**Test scaffolding:** add `vitest` (devDependency) + `"test": "vitest run"`; unit tests for `effectiveStatus`/`hasPro` (all §3.4 lifecycle rows, grace boundary, owner override, trial expiry) and service-level tests for idempotent replay and out-of-order application (criterion 2 mechanically checked).

**Gate 1 exit:** sandbox purchase (real checkout redirect with `externalCustomerId`) flips the entitlement row via webhook; portal reachable; replay of the same event id is a no-op; trial rows created on fresh signup.

### Phase 2 — Gating, trial UX, degrade (spec §6 Phase 2)

**Gate inventory wiring (spec §3.5, row by row):**
| Gate | Concrete change |
|---|---|
| YouTube connect + all YT routes | `requirePro` in `src/app/api/connections/link/google/start/route.ts` (403 for free — callback inherits protection since start mints state); `requirePro` in `src/app/api/events/youtube-chat/route.ts`; Connections UI (`src/app/connections/page.tsx` + row components): YouTube row renders `LockedCard` for free users, **preserved connection row** (not hidden) for lapsed users per degrade rules. **Interface handed to the YouTube workstream:** every new `/api/youtube/*` route from `specs/YouTube-Chat-Connect.md` must open with `requirePro()` (or `requireProApiKey`) from `src/lib/entitlements.ts`; its client polling loop should treat 403 as "stop polling, show locked card". That guard's existence + signature is this plan's deliverable; YouTube internals are not. |
| Conditional-logic trigger execution | No executor in repo (§1.5). Deliverable now: `hasPro` in `/api/me/entitlement` consumed by the desktop app; documented contract that the executor (wherever it lands) skips-but-preserves Pro triggers when `hasPro` is false. Full runtime verification deferred to that feature's workstream. |
| Multi-action macro execution | Same as above. |
| OBS write actions | Same as above + standing rule: any future webapp dispatch route gets `requirePro` → 403 (criterion 6's "API returns 403" is testable the moment such a route exists). |
| Event-history >30d | `src/app/api/events/route.ts`: for `!hasPro`, force `from = max(from, now-30d)` (and clamp `to` accordingly) server-side; `src/app/api/analytics/route.ts`: replace tier clamp — free allows 7d/30d, clamps 90d→30d; UI range pickers show locked options with upgrade CTA. |
| Profile count >1 | No profiles feature exists. Contract recorded: profile create/switch APIs must `requirePro` when count >1; extras become read-only on degrade; active profile falls back to first. Deferred like triggers. |

**Trial + lifecycle UX:**
- `DunningBanner` (new, `src/components/dunning-banner.tsx`) rendered from `AppHeader` when `effectiveStatus === "past_due_grace"`: "payment failed — update via portal" linking `/api/portal`. Trial countdown chip (days left) in the header while `trialing`.
- Degrade behavior per §3.4: everything visible-but-locked, nothing deleted. History >30d hidden by clamp, not deleted (retention untouched — already true, tables keep all rows). YouTube: connection row preserved, feed/polling stops via the route 403s.

**Locked-state UI kit (new, in `src/components/`, barrel-exported):** `ProBadge`, `ProGate` (uses `use-entitlement`; renders children or locked preview + refactored Pro `UpgradeModal`), `LockedCard`, `DunningBanner`.

**Billing surface rebuild:** `/billing` page (current plan, status, dates, portal + checkout CTAs); success page polling (~1.5s interval, ~20s budget) per criterion 4; account page plan display.

**Site deliverables (spec §4):** public `/pricing` page (no auth) — Free vs Pro matching §2 verbatim, monthly/yearly toggle, trial messaging, linked from homepage; `/terms` and `/privacy` static pages + footer links on `src/app/page.tsx` layout (shared deliverable with worktree 1 for Google OAuth verification).

**Gate 2 exit — acceptance criteria 1–3, 5–7 verified in sandbox:**
1. **C1** full journey walkthrough using sandbox checkout + the rebuilt dev toolbar for trial-lapse simulation; each §3.4 state observed in UI.
2. **C2** vitest replay/out-of-order tests + a live duplicate-delivery replay from the Polar sandbox dashboard.
3. **C3** Polar sandbox payment-failure → `past_due` → banner; clock-simulated grace expiry (dev toolbar) → access drop.
4. **C5** `grep -rn "hasPro\|requirePro" src` shows only `src/lib/entitlements.ts` definitions + gate call sites; `grep -ri "hasAccess\|GATES\|tier" src` shows no plan predicates; owner account with zero Polar rows passes every gate.
5. **C6** every implementable §3.5 row exercised with a Free account (server 403s + UI locked states); trigger/OBS/profile rows verified to the extent of the contract (`/api/me/entitlement` over `x-api-key` returns `hasPro:false`), remainder explicitly deferred (§1.5).
6. **C7** free-tier sweep: dashboard, events ≤30d, analytics ≤30d, Spotify, widgets, single-profile flows all nag-free.

### Phase 3 — Production & review (spec §6 Phase 3)

- Production Polar org "CreatorDeck", individual identity verification, socials on org settings, `CREATORDECK` statement descriptor request, 100%-off reviewer discount code.
- Production env vars (`POLAR_SERVER=production`, live token/secret/product ids), webhook endpoint on the production domain, `npm run db:push:prod` for migration 0001.
- Pricing page live on creatordeck.itsspekkie.com; terms/privacy linked.
- **C8:** owner performs one real purchase + refund end-to-end; attach dogfood recording from worktree 1 if useful; submit review pack. Gate 3: review submitted; payments open, payouts held pending approval (expected, non-blocking).

---

## 4. Open questions for the owner

1. **Pricing confirmation (spec §2 requires this at Gate 0):** Pro Monthly €7.99 / Pro Yearly €59 — confirm or adjust before sandbox products are created.
2. **Legacy users' trial:** users who signed up before this ships have no `trialEndsAt`. Grant everyone a 14-day trial starting at deploy (generous, one SQL backfill), or no trial for existing accounts (they're all effectively free/waitlist today)? Default in plan: lazy `plan=free,status=none` without trial unless you say otherwise.
3. **Trial without card:** if Polar sandbox shows no-card trials aren't supported (Gate 1 check), pick the fallback: card-required trial vs "Pro locked until first checkout". Spec leaves this to Gate 1; flagging early.
4. **Waitlist `interested_tier` data:** column retains historical tier1/2/3 interest signups; fine to keep as-is (read-only history), or export/purge?
5. **Test tooling:** plan adds `vitest` as a devDependency to mechanically verify criteria 2 and 5. Veto if you want the repo dependency-minimal; fallback is scripted manual verification.
6. **Desktop-app entitlement contract (§1.5):** confirm the C# app can poll `GET /api/me/entitlement` with its API key and enforce skip-but-preserve locally; this plan makes the webapp the authority but cannot implement the desktop side.
