# Billing → Polar migration — PROGRESS / RESUME

**Branch:** `billing-polar-migration`
**Full plan:** `~/.claude/plans/kick-off-the-billing-planner-shimmering-valley.md`
**Spec:** `specs/Billing-Entitlements.md`
**Last updated:** 2026-07-05

## Status: Phase 0 ✅ committed · Phase 1 ✅ committed (code) · Gate 1 ⏳ not verified

- `666ca07` Phase 0 — tear down Lemon Squeezy, retier to Free/Pro, add entitlements + webhook_events tables.
- `fbfb5b9` Phase 1 — Polar checkout/portal/webhook routes, entitlement engine, DB-backed `hasPro`.
- App builds green (62 routes). Nothing applied to any DB yet.

## Owner decisions (locked)
- Pricing: **Pro €7.99/mo · €59/yr** (EUR).
- **Trial: WITH card (Polar-native standard)** — 14-day trial configured on the Polar products; card collected at checkout; Polar auto-charges at trial end. ⚠️ This CHANGED from the earlier local-signup-trial approach — see "DO FIRST" below.
- Execution: phase-gated, review between phases.
- Operator: Tom Spek (individual, NL, no KVK). Governing law NL.

## ⚠️ DO FIRST next session — switch trial model to card-required (Polar-native)
Phase 1 code currently grants a **local, no-card 14-day trial at signup**. The new decision is a **card-required trial at checkout**. Make these edits, then `npx next build`:

1. **`src/lib/auth.ts`** — remove both `await entitlementService.startTrialIfNew(userId)` calls (Twitch + Google new-user branches) and the `entitlementService` import. New users are Free until they check out.
2. **`src/services/entitlement.service.ts`** — delete `startTrialIfNew` + `TRIAL_DAYS`. In `applyFromWebhook`, when `sub.status === "trialing"`, also pass a `trialEndsAt` (the subscription's trial end) so the trial flows through the existing `trialEndsAt` gate. **Verify the exact trial-end field on a real `subscription.created`/`subscription.updated` trialing payload at Gate 1** — likely `sub.currentPeriodEnd` during trial (confirm; Polar may expose an explicit trial end).
3. **`src/repositories/entitlement.repository.ts`** — add optional `trialEndsAt` to `WebhookState`; set it in the insert + `onConflictDoUpdate` set **only when provided** (still don't clobber it to null on non-trial events).
4. **`src/repositories/entitlement.repository.ts`** — `ensureWithTrial` is now unused; delete it (or repurpose to `ensureRow` with status `none`).
5. `hasProFromEntitlement` already grants Pro when `trialEndsAt` is in the future — no change. `"trialing"` is intentionally NOT in `PRO_STATUSES` (avoids never-expiring trial); the mapped `trialEndsAt` is the gate.
6. Backfill SQL already updated to no-trial (`drizzle/backfill-entitlements.sql`).

## Polar dashboard — you've created the sandbox org, NO product yet
Create in the **sandbox** org:
- Two products under one shared benefit "CreatorDeck Pro": **`pro-monthly` €7.99**, **`pro-yearly` €59**.
- On each product/price, enable a **14-day free trial (card required)**.
- Webhook endpoint → `https://<preview-url>/api/webhooks/polar`; copy the **webhook secret**.
- Copy the **access token** and both **product IDs**.

## Env to set (`.env.local` + Vercel preview) — routes 503 until present
```
POLAR_ACCESS_TOKEN=<sandbox access token>
POLAR_WEBHOOK_SECRET=<webhook signing secret>
POLAR_SERVER=sandbox
POLAR_PRODUCT_PRO_MONTHLY=<product id>
POLAR_PRODUCT_PRO_YEARLY=<product id>
```
(Env is read optionally in `src/lib/env.ts` so the build stays green without them.)

## Apply DB changes (not yet done)
NOTE: `drizzle/` is gitignored (schema-first repo — `db:push` diffs `src/lib/schema.ts`
directly, so migration files are local-only). The backfill is DATA, so it's inlined
here to survive — the `drizzle/backfill-entitlements.sql` copy is convenience-only.
```
# sanity: expect 0 real LS subscribers
npm run db:push            # dev — applies the schema diff (entitlements, webhook_events, drop LS cols)
# then run the backfill (baseline Free row per existing user, NO trial — card trial starts at checkout):
```
```sql
INSERT INTO entitlements (user_id, plan, status)
SELECT u.id, 'free', 'none'
FROM users u LEFT JOIN entitlements e ON e.user_id = u.id
WHERE e.user_id IS NULL;
```
```
# prod later (Phase 3): npm run db:push:prod  +  same backfill against DATABASE_URL_PROD
```

## Gate 1 verification (sandbox) — the Phase 1 exit criteria
1. `/billing` → Upgrade to Pro → Polar sandbox checkout (enter test card) → trial starts.
2. Return to `/billing/success` → flips to Pro within seconds (it polls `/api/me/entitlement`).
3. Confirm `entitlements` row: status `trialing` (or `active`), `polar_subscription_id` set, `trialEndsAt` populated, Pro granted.
4. `/api/portal` → cancel → row goes `canceled_active`, Pro until `currentPeriodEnd`.
5. Re-deliver the same webhook event id → second call returns `{duplicate:true}`, no state change (idempotency ledger).
6. Owner bypass: a user with `isAdmin=true` is Pro with zero Polar rows (dev toolbar `/dev` toggles it).

## Then: Phase 2 (not started)
Runtime gates via `requirePro`/`hasPro` + degrade UI (spec §3.4/§3.5):
- YouTube: swap `src/lib/youtube-gate.ts` body to `hasPro(session.userId)`; YT routes call `requirePro`.
- Event history >30d: server-side `from` clamp for Free in `src/app/api/events/route.ts`.
- OBS-write/macros/profiles: NOT built — scaffold `requireProForApiKey` at `src/lib/api-auth.ts`/`widget-auth.ts`.
- `<ProLock>`/`<LockedPreview>` component; `past_due` dunning banner; client `useEntitlement()` hook.

## Key files (Phase 1)
- Predicate: `src/lib/require-pro.ts` (`hasPro`/`requirePro`), pure logic `src/lib/entitlement.ts`.
- Routes: `src/app/api/{checkout,portal,me/entitlement}/route.ts`, `src/app/api/webhooks/polar/route.ts`.
- Service/repos: `src/services/entitlement.service.ts`, `src/repositories/{entitlement,webhook-events}.repository.ts`.
- Polar client for cancel-on-delete: `src/lib/polar.ts` (used in `src/services/account.service.ts`).
- Schema: `src/lib/schema.ts` (entitlements, webhook_events, plan/entitlement_status enums; users.tier nullable, LS cols dropped). Migration `drizzle/0002_handy_guardian.sql`.

## Notes / gotchas
- `hasPro` reads the DB, not the session (JWT is a stale cache — `tier`/`isAdmin` only refresh on `session.update()`).
- Webhook idempotency keys on the `webhook-id` header; handlers set ABSOLUTE state so out-of-order/duplicates converge.
- Privacy/Terms pages already name Polar as merchant of record.
