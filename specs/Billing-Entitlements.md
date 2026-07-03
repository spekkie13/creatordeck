# Spec: Billing & Entitlements — Polar.sh Pro tier (CreatorDeck)

**Status:** Draft — awaiting approval (Gate 0)
**Workstream:** Worktree 2 of 2 (parallel with `spec-youtube-integration.md`)
**Author:** Spec drafted with Claude, to be reviewed by Claude Code against the actual repo before Gate 0 approval

---

## 1. Goal

Introduce a paid **Pro** subscription (monthly + yearly) via Polar.sh as merchant of record, with a local entitlement system that gates features reliably, survives webhook weirdness, and passes Polar's account review on the first attempt.

**Definition of done:** a stranger can sign up, hit a Pro wall, check out, get Pro features automatically within seconds, manage/cancel via customer portal, and lose access cleanly at period end — with zero manual intervention. That exact journey is what Polar's reviewer will walk.

## 2. Tier definition (locked — product decision, not open for redesign)

### Free — "the complete solo-streamer deck"
- Twitch: chat read/send; follows/subs/bits/raids; channel points
- Dashboard: live event feed, follower/sub counts, session duration
- Chat commands + **simple** event triggers (single-action)
- Config save/load — **single profile**
- Event history: **30 days**
- Spotify: full feature set incl. song requests via chat
- OBS/desktop app: **read-only** (current scene, now playing, connection status)

### Pro — "multi-platform + control + depth"
- YouTube connection (unified chat, Super Chats/Stickers) — headline feature
- Advanced automation: **conditional logic** + **multi-action macros**
- OBS **write/control**: scene switching, source toggling, source volume — including as trigger/macro actions
- Event history: unlimited (+ future analytics layer inherits Pro)
- Multiple profiles/presets (>1)

### The enforcement principle
- OBS: Free can **see**, Pro can **act**. Enforce at the action-dispatch level, not just UI.
- Automation: a trigger containing conditional logic, multiple actions, or any OBS write action is a Pro trigger — evaluated at **execution time**, not only at creation time.

### Pricing (initial; adjust freely later — Polar supports catalog changes)
- Pro Monthly: €7.99/mo · Pro Yearly: €59/yr (~38% off) — placeholder values, owner confirms at Gate 0
- 14-day full-Pro trial on signup, no card required if Polar config allows; otherwise card-required trial (decide at Gate 1 based on actual Polar trial options)

## 3. Architecture

### 3.1 Components
- **Polar products:** `pro-monthly`, `pro-yearly`, both carrying the same benefit ("CreatorDeck Pro"). Sandbox org first; production org named **CreatorDeck**.
- **Integration:** `@polar-sh/nextjs` adapters:
    - `GET /api/checkout` — Checkout redirect (products param, success URL)
    - `GET /api/portal` — Customer portal redirect (self-serve manage/cancel)
    - `POST /api/webhooks/polar` — webhook handler (signature-verified)
- **Customer mapping:** pass our `user.id` as Polar's `externalCustomerId` at checkout creation so every webhook resolves to a user without email-matching heuristics.

### 3.2 Entitlement model — local cache, webhook-driven
**Principle: never call Polar on the hot path.** Subscription state lives in our DB, mutated only by verified webhooks (plus the trial/owner logic below).

```
model Entitlement {
  id                   String    @id @default(cuid())
  userId               String    @unique
  plan                 String    @default("free") // free | pro
  status               String    @default("none") // none|trialing|active|canceled_active|past_due|revoked
  polarCustomerId      String?
  polarSubscriptionId  String?
  currentPeriodEnd     DateTime?
  trialEndsAt          DateTime? // set at signup: now + 14d
  updatedAt            DateTime  @updatedAt
}

model WebhookEvent {          // idempotency ledger
  id          String   @id    // Polar event id
  type        String
  processedAt DateTime @default(now())
}
```

**The single gate (one source of truth, used by server routes, trigger executor, and UI):**
```ts
function hasPro(u: { isOwner: boolean; ent: Entitlement }): boolean {
  if (u.isOwner) return true;                                  // operator flag — owner & comped accounts, not a fake subscription
  if (u.ent.trialEndsAt && u.ent.trialEndsAt > now()) return true;
  return ["active", "canceled_active", "past_due_grace"].includes(effectiveStatus(u.ent));
}
```
- `isOwner` is a user-table boolean (or allowlist env var) — owner/comped access never touches Polar.
- **No scattered plan checks.** Every gate in the codebase calls `hasPro` (or a derived `requirePro` middleware/guard). Grep-ability is an acceptance criterion.

### 3.3 Webhook handling
- Verify signatures (adapter handles this; confirm at Gate 1).
- **Idempotent:** insert event id into `WebhookEvent` first (unique constraint); duplicate → ack 200 and skip.
- **Out-of-order tolerant:** handlers set state from the event's full payload (status + period end), never increment/toggle relative to current state.
- Events handled: subscription created / updated / active / canceled / revoked; checkout-related events as needed for the success page.
- Success-page race: after checkout redirect, if the webhook hasn't landed yet, the success page polls our own `GET /api/me/entitlement` briefly ("activating…") rather than assuming failure.

### 3.4 Lifecycle semantics (decided now, cheap in spec / expensive retrofitted)
| State | Access | Notes |
|---|---|---|
| `trialing` | Pro | 14 days from signup; one trial per user, ever |
| `active` | Pro | |
| `canceled_active` | Pro until `currentPeriodEnd` | cancel ≠ instant loss |
| `past_due` | Pro during a **3-day grace window**, then treated as revoked | dunning banner in UI |
| `revoked` / lapsed trial | Free | degrade rules below |

**Degrade behavior (visible-but-locked pattern):**
- Pro features render locked with previews — never hidden.
- **Automations: disable-but-preserve.** Conditional triggers, macros, and OBS-write actions created during trial/Pro are kept, shown greyed-out with an upgrade prompt, and skipped by the executor. Deleting a user's own work is forbidden.
- Profiles >1: extras become read-only/locked, not deleted; active profile falls back to the first.
- History >30 days: hidden behind the gate, **not deleted** — retention of raw data is unaffected by plan (storage cost accepted; instant restore on upgrade is the payoff).
- YouTube: connection row preserved; polling and feed stop; locked state on the connection card.

### 3.5 Gate inventory (exhaustive — acceptance criterion 6 tests every line)
| Gate | Enforcement point |
|---|---|
| YouTube connect + all YT routes | server routes + Connections UI |
| Conditional-logic trigger execution | trigger executor (runtime) |
| Multi-action macro execution | trigger/macro executor (runtime) |
| OBS write actions (scene/source/volume) | action dispatch to desktop app + any direct API route |
| Event-history queries beyond 30 days | history API (server-side date clamp for Free) |
| Profile count > 1 (create/switch) | profile API + UI |

## 4. Site & review deliverables (in scope for this workstream)
- **Pricing page** on creatordeck.itsspekkie.com: Free vs Pro comparison matching §2 exactly; monthly/yearly toggle; trial messaging. Waitlist framing on the site remains **free-only** (paid waitlists violate Polar AUP).
- Terms + privacy policy pages linked in footer (also needed for Google OAuth verification — shared deliverable with worktree 1).
- **Polar review pack:** org named CreatorDeck; socials added to org settings; 100%-off discount code for reviewers; refund of any live-mode test purchases; request CREATORDECK statement descriptor; dogfood screen recording from worktree 1 attached if useful.

## 5. Acceptance criteria
1. Sandbox: full journey — signup → trial active → trial lapse (simulated) → locked-with-preview state → checkout → webhook → Pro active in UI without reload gymnastics → portal cancel → `canceled_active` until period end → revoked → clean degrade per §3.4.
2. Webhook replay (same event id twice) causes no state corruption; out-of-order canceled→updated sequence resolves to correct final state.
3. Payment-failure path: `past_due` shows dunning banner; access drops after grace window.
4. Success-page race handled: checkout return before webhook shows "activating…", resolves within seconds.
5. `hasPro` is the only entitlement predicate in the codebase (grep check); owner flag grants Pro with zero Polar records.
6. Every row of the gate inventory (§3.5) verified with a Free account — including **runtime** attempts (e.g., a pre-existing conditional trigger does not fire for a lapsed user; an OBS write action dispatched via API returns 403).
7. Free experience per §2 is fully functional with zero Pro nags outside natural gate encounters.
8. Production: one real end-to-end purchase + refund by owner before review submission; review pack complete.

## 6. Phases & gates
- **Gate 0 — Spec approval:** Claude Code reviews against repo (auth/session shape, Prisma conventions, where the trigger executor lives, desktop-app action dispatch path) + owner approves pricing numbers.
- **Phase 1 — Foundation:** Polar sandbox org + products, checkout/portal/webhook routes, Entitlement + WebhookEvent models, `hasPro` + `requirePro`, owner flag. **Gate 1:** sandbox purchase flips entitlement via webhook.
- **Phase 2 — Gating:** wire every §3.5 gate incl. runtime executor checks; trial logic; degrade behavior; locked-UI components. **Gate 2:** criteria 1–3, 5–7 pass in sandbox.
- **Phase 3 — Production & review:** production org, identity verification (individual), pricing page live, real purchase + refund, review pack, submit. **Gate 3:** review submitted; payments open (payouts held until approval — expected, non-blocking).

## 7. Risks & open questions
| Risk | Impact | Mitigation |
|---|---|---|
| Polar review slower than ~2 weeks | Payout delay only — sales keep flowing | Submit early; complete review pack |
| Trial-without-card not supported as assumed | Signup-flow change | Verify Polar trial options at Gate 1; fallback: card-required trial or "locked until first checkout" |
| Runtime gating in trigger executor is invasive | Refactor cost in automation engine | Gate 0 repo review sizes this before commitment |
| Webhook delivery to Vercel route misconfigured (body parsing/signature) | Silent entitlement failures | Adapter defaults + replay tests in criterion 2 |
| VAT/invoice edge cases | None on our side — Polar is MoR | No action; do not build tax logic |

**Open for Gate 0 review (Claude Code):** session/user object shape for `isOwner`; where trigger execution actually lives (webapp vs desktop app — if the C# app executes macros locally, the runtime gate needs an entitlement signal in the config/API payload it consumes, which is a design point to settle before Phase 2); existing UI kit for locked-state components.
