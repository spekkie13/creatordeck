# Billing → Polar migration — PROGRESS / RESUME

**Branch:** `billing-polar-migration`
**Full plan:** `~/.claude/plans/kick-off-the-billing-planner-shimmering-valley.md`
**Spec:** `specs/Billing-Entitlements.md`
**Last updated:** 2026-07-13

## Status: Phase 0 ✅ · Phase 1 ✅ · card-trial switch ✅ · dev DB applied ✅ · Gate 1 ⏳ BLOCKED on sandbox creds

## ⚠️ BLOCKER found 2026-07-13 — Polar creds are in the WRONG org
Prod `/api/checkout` failed twice on 2026-07-13:
1. `ERR_INVALID_URL` — the Checkout adapter needs an **absolute** `successUrl`; fixed in
   `6e04f2a` (resolved against `req.nextUrl.origin`). Deployed to prod.
2. Polar SDK 401 `invalid_token` — the access token + both product IDs
   (`e855fcb1-…` monthly, `a68ed495-…` yearly) were created in the Polar **PRODUCTION org**
   (verified: token 200s on `api.polar.sh`, products exist there), but `POLAR_SERVER=sandbox`
   sends it to `sandbox-api.polar.sh`. Also: **no webhook endpoint exists in the production
   org**, so the stored `POLAR_WEBHOOK_SECRET` matches nothing.

**Owner decision (2026-07-13): stay sandbox-first per plan.**

Update (2026-07-13, later): sandbox org created; token + product IDs live in `.env.local` +
Vercel prod; prod redeployed and checkout-create verified against sandbox API. REMAINING:
- **Token scopes too narrow** — has `checkouts:write` (checkout works) but lacks
  `customer_sessions:write` (→ `/api/portal` will 401) and `webhooks:write`. Regenerate the
  sandbox org token with all scopes, update `.env.local` + Vercel prod, redeploy.
- **No webhook endpoint in sandbox org** — entitlements can't land; `/billing/success` will
  poll forever. Create in dashboard (or via API once token has `webhooks:write`):
  URL `https://creatordeck.itsspekkie.com/api/webhooks/polar`, format raw, all
  `subscription.*` events; then put the generated secret in POLAR_WEBHOOK_SECRET (both envs).
- **Pricing mismatch vs locked decision**: sandbox products are **€12.99/mo, €129.99/yr**;
  the locked decision above says €7.99/€59. Align one or the other.
- Later, on Phase 3 cutover: archive/recreate products in the production org deliberately and
  add its webhook endpoint (the accidental production-org products can stay for now).

- `666ca07` Phase 0 — tear down Lemon Squeezy, retier to Free/Pro, add entitlements + webhook_events tables.
- `fbfb5b9` Phase 1 — Polar checkout/portal/webhook routes, entitlement engine, DB-backed `hasPro`.
- Card-required trial switch — removed local signup trial; trial end now flows from Polar webhooks. ✅ 2026-07-06.
- App builds green. Nothing applied to any DB yet.

## Owner decisions (locked)
- Pricing: **Pro €7.99/mo · €59/yr** (EUR).
- **Trial: WITH card (Polar-native standard)** — 14-day trial configured on the Polar products; card collected at checkout; Polar auto-charges at trial end. ⚠️ This CHANGED from the earlier local-signup-trial approach — see "DO FIRST" below.
- Execution: phase-gated, review between phases.
- Operator: Tom Spek (individual, NL, no KVK). Governing law NL.

## ✅ DONE (2026-07-06) — trial model switched to card-required (Polar-native)
Phase 1 previously granted a **local, no-card 14-day trial at signup**. Now a **card-required trial at checkout**, driven entirely by Polar webhooks. Build green after the switch.

1. ✅ **`src/lib/auth.ts`** — removed both `startTrialIfNew(userId)` calls (Twitch + Google new-user branches) and the `entitlementService` import. New users are Free until they check out.
2. ✅ **`src/services/entitlement.service.ts`** — deleted `startTrialIfNew` + `TRIAL_DAYS`. In `applyFromWebhook`, on `sub.status === "trialing"` it passes `trialEndsAt: sub.trialEnd` so the trial flows through the existing `trialEndsAt` gate. **RESOLVED:** the Polar `Subscription` type has an explicit `trialEnd: Date | null` field (SDK 0.48.1, `dist/*/models/components/subscription.d.ts:63`) — no Gate 1 guesswork needed; `currentPeriodEnd` was not required.
3. ✅ **`src/repositories/entitlement.repository.ts`** — added optional `trialEndsAt` to `WebhookState`; `upsertFromWebhook` writes it in the insert + `onConflictDoUpdate` set **only when provided** (spread-conditional), so non-trial events never clobber a set trial end.
4. ✅ **`src/repositories/entitlement.repository.ts`** — deleted the now-unused `ensureWithTrial`.
5. ✅ `hasProFromEntitlement` unchanged — already grants Pro when `trialEndsAt` is in the future. `"trialing"` intentionally NOT in `PRO_STATUSES` (avoids never-expiring trial); the mapped `trialEndsAt` is the gate.
6. ✅ Backfill SQL already no-trial (`drizzle/backfill-entitlements.sql`).

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

## Apply DB changes — ✅ DONE on PRODUCTION (2026-07-13)
Applied atomically to the **production** Neon DB (`ep-sweet-wave…` — owner confirmed identity
and approved after the fact): entitlements + webhook_events tables, plan/entitlement_status
enums, users.tier → nullable, dropped LS **and legacy Stripe** columns (all verified empty
first; 1 user, 0 subscribers). Backfill inserted one Free/none row. Constraints renamed to
drizzle conventions; `drizzle-kit push` reports "No changes detected".

✅ Preview DB (`ep-noisy-queen…`) migrated too (2026-07-13): same statements minus the
Stripe drops (that DB never had them); LS columns verified empty first; 1 Free/none
backfill row; `drizzle-kit push` reports "No changes detected". **Both DBs are now
migrated.** Env layout: `.env.local` DATABASE_URL = preview (fresh URL from owner;
old credential was dead), DATABASE_URL_PROD = production (sweet-wave). Vercel Preview
DATABASE_URL is a *sensitive* var (pulls as empty string — expected; deployments get it
fine); owner re-set it 2026-07-13.

### Original instructions (kept for the preview-DB run)
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
