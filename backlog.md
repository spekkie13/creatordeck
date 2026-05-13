# Stream Manager — Product Backlog

## Architectuur overzicht

```
Next.js app (gedeployed op Vercel)
├── Twitch OAuth (NextAuth)           ✅ gereed
├── Google/YouTube OAuth (NextAuth)   ✅ gereed  [Epic 6.1–6.3]
├── Twitch EventSub webhooks          ✅ gereed (subs, follows, bits, raids)
├── YouTube Live Chat poller          ✅ gereed  [Epic 6.4] — cron via cron-job.org
├── Neon DB (Drizzle ORM)             ✅ gereed
├── Web dashboard                     ✅ gereed (live feed, sub goal, audience pills, goals page, event detail modal, landing page carousel)
├── Guided onboarding wizard          ✅ gereed
├── Code kwaliteit (shortcomings)     ✅ Cat 1–6 gereed (branch: fix-violations, nog niet gemerged)  ⚠️ Cat 7–8 open
└── Analytics & config API            🔴 nog te bouwen

C# Desktop app (lokaal)
├── OBS websocket                     ✅ gereed
├── Spotify API                       ✅ gereed
└── Pollt Next.js API                 ✅ gereed
```

> **Schema tabellen:** `users`, `linked_accounts`, `sub_events`, `follow_events`, `cheer_events`, `raid_events`, `sub_goals`, `eventsub_subscriptions`, `yt_superchat_events`, `yt_member_events`, `yt_stream_sessions`
> **ORM:** Drizzle ORM — schema wijzigingen in `src/lib/schema.ts`, migreren met `npx drizzle-kit push`
>
> **YouTube vs Twitch architectuurverschil:** Twitch stuurt events via webhooks (EventSub). YouTube heeft geen equivalent — live chat events worden gepolled via de YouTube Data API v3. De poller draait als externe cron job (cron-job.org, elke minuut) en haalt `liveChatMessages` op voor actieve uitzendingen.
>
> **Sessie-inhoud (NextAuth JWT):** `session.twitchId`, `session.youtubeChannelId`, `session.displayName`, `session.userId`. Access tokens zitten **niet** in de sessie — ophalen via `linked_accounts` tabel.

---

## Subscription tiers & upgrade psychology

> **Kernprincipe:** de gratis tier creëert de gewoonte. Elke betaalde tier lost een specifieke frustratie op die de gebruiker zelf ervaart naarmate ze serieuzer gaan streamen. Multi-platform unificatie zit altijd gratis — dat is de identiteit van het product.

| Tier | Prijs | Wat ze krijgen | Upgrade trigger |
|------|-------|----------------|-----------------|
| **Free** | gratis | Unified live dashboard (Twitch + YouTube), basisoverlays, laatste 7 dagen event history | Ziet "7 dagen" en wil het grotere plaatje zien |
| **Tier 1** | $4,99/mo | Volledige analytics history, sessie-breakdowns, platform vergelijkingsgrafiek | Wil alerts en stream control vanuit één plek |
| **Tier 2** | $11,99/mo | Custom alerts overlay, stream info beheer, simultaan go-live op beide platforms, cross-platform goals | Weet *wat* er gebeurt maar niet *waarom* |
| **Tier 3** | $19,99/mo | AI stream analyse, VOD transcriptie insights, verbeteringsrapporten, retentie coaching | Al geïnvesteerd — behandelt streamen als carrière |

---

## Prioriteiten voor marketing-readiness

> **Doel:** een afgerond, verkoopbaar product dat streamers direct waarde biedt op alle aangesloten platformen — voordat zware marketing begint.

### ✅ Fase 1 — Fundament (gereed)
```
✅  Epic 1       — Twitch events opslaan & structureren
✅  Epic 2.1/2.2 — Live dashboard & SSE event feed
✅  Epic 6.1–6.4 — YouTube OAuth, schema, token refresh, poller
✅  [UX]         — Guided onboarding wizard
✅  [UX]         — Audience pills (Twitch + YouTube counts op dashboard)
✅  /goals       — Aparte goals pagina met quick access link
✅  [7.6]        — YouTubeManage component op connections pagina
✅  [GOALS]      — Multi-platform goals (Twitch follows, YouTube members) — dashboard cards + goals page
✅  [UX]         — Event detail modal (sub, bits, superchat, member)
✅  [UX]         — Landing page screenshot carousel + sticky nav
✅  [UX]         — Platform status integrated into greeting card
✅  [UX]         — YouTube subscriber token refresh on expired access token
```

### 🔨 Fase 1b — Polish & refinement (voor verdere uitbouw)
> Bestaande features afmaken en consistenter maken voordat nieuwe functionaliteit wordt gebouwd. Zorgt dat het product er klaar uitziet voor echte gebruikers.
```
-   [POLISH-1] — Live pagina verfijnen (layout, Spotify player/queue tweaks, spacing, responsive)
-   [POLISH-2] — Dashboard: alle aangesloten accounts tonen hun verbindingsstatus (Twitch, YouTube, Spotify) — ook wanneer niet verbonden, met duidelijke connect CTA
-   [POLISH-3] — Connections pagina doorlopen op consistentie en volledigheid per platform
-   [POLISH-4] — Algemene UI tweaks: typografie, witruimte, dark mode inconsistenties, lege states
```

### ✅ Code kwaliteit — shortcomings review (branch: fix-violations)
```
✅  Cat 1  — API response helpers (apiError / apiSuccess) toegevoegd
✅  Cat 2  — Stille errors gesurface'd (webhooks, Lemon Squeezy, SSE)
✅  Cat 3  — Zod input validatie op alle API boundaries
✅  Cat 4  — Business logic uit route handlers gehaald → services
✅  Cat 5  — Diepe nesting opgelost (downstream effect van Cat 4)
✅  Cat 6  — Single Responsibility hersteld (downstream effect van Cat 4)
⚠️  Cat 7  — Magic numbers/strings (TODO: named constants)
⚠️  Cat 8  — Duplicatie (TODO: gedeelde polling constants, OAuth callback structuur)
⚠️       fix-violations branch nog niet gemerged naar main
```

### 🐛 Bekende bugs
```
-   [BUG-1] — YouTube chat verschijnt niet in /live unified chat panel
              Pipeline: cron-job.org → /api/cron/youtube-poll → DB → SSE → client
              Onderzoek gestart; root cause nog niet vastgesteld
```

### 🔨 Fase 2 — Integratie completeren (volgende stap)
> Sluit de gratis tier af: YouTube events volledig zichtbaar in de live feed zodat de unified dashboard belofte waargemaakt wordt.
```
1.  [6.5]   — YouTube events (superchats, members) in SSE live feed (real-time, not just history)
             ⚠️  Verificatie vereist YPP-lidmaatschap (superchats/members zijn niet beschikbaar zonder monetisatie) — kan niet lokaal getest worden
```

### 🔨 Fase 3 — OBS widgets (free tier hook)
> Overlays zijn gratis en zichtbaar op stream — sterkste word-of-mouth kanaal. Elke kijker ziet het product in actie.
```
2.  [8.1]   — Widget authenticatie (token-based, geen browser sessie nodig)      ✅ gereed
3.  [8.3]   — Goal overlay widget (/widget/goal) — animated progress bar in OBS      ✅ gereed
4.  [IDEA-3] — Custom browser sources (event ticker, now-playing, etc.)
5.  [IDEA-4] — Alert overlay widget (/widget/alerts) — Tier 2 feature  ✅ Spec gereed (specs/IDEA-4-alert-config.md) — pre-req: rebase feature/alerts-engine op main
```

### 🔨 Fase 4 — Analytics + Lemon Squeezy (Tier 1 activeren)
> Analytics is de eerste upgrade trigger: gebruiker ziet "7 dagen" en wil meer. Lemon Squeezy maakt monetisatie mogelijk.
```
6.  [4.1]   — Analytics API route (totalen per dag, per sessie)          ✅ gereed
7.  [4.2]   — Analytics pagina (grafiek, sessietabel)                    ✅ gereed
8.  [4.3]   — Sessie detailpagina                                        ✅ gereed
9.  [4.4]   — 7-dagen limiet op gratis tier (upgrade prompt na 7d)          ✅ gereed
10. [5.1]   — Lemon Squeezy abonnement
11. [5.2]   — Feature gates per tier
12. [5.3]   — Billing pagina
    ↑ SHIP: begin marketing hier — product is verkoopbaar
```

### 🔨 Fase 5 — Tier 2 features (stream control + alerts)
> Tweede upgrade trigger: gebruiker wil zijn stream beheren en alerts instellen zonder van tab te wisselen.
```
13. [IDEA-1] — Stream info bewerken (Twitch title/game, YouTube title/desc)
14. [IDEA-4] — Alert configuratie UI + /widget/alerts OBS overlay
15. [7.1]   — Twitch chat via EventSub
16. [7.2]   — chat_messages tabel
17. [7.3]   — YouTube chat → chat_messages
18. [7.4]   — SSE stream uitbreiden met chat events
19. [7.5]   — Unified chat UI in dashboard
20. [8.2]   — Chat overlay widget (/widget/chat) — voor OBS
    ↑ Sterkste USP live — intensiveer marketing
```

### 🔨 Fase 6 — Tier 3: AI analyse (premium differentiator)
> Derde upgrade trigger: gebruiker weet wat er gebeurt maar wil begrijpen waarom en hoe te verbeteren.
```
21. [AI-1]  — Session AI analyse (Claude API): engagement mapping, sessie vergelijking, platform groei patronen
22. [AI-2]  — VOD transcriptie (Whisper API) + energie/pacing analyse
23. [AI-3]  — YouTube retentie curve integratie (Data API) + AI interpretatie
24. [AI-4]  — Wekelijks verbeteringsrapport per e-mail (Tier 3)
25. [6.6]   — YouTube analytics (superchats, members in analytics pagina)
26. [IDEA-2] — VOD/video beheer (YouTube volledig, Twitch titel+desc + deep-link)
```

### 🔨 Fase 7 — Verdieping & uitbreiding
```
27. [4.x]   — Sessie-overzicht Twitch + YouTube gecombineerd
28. Epic 3  — Configuratie beheren (commands, triggers, macros)
29. Epic 12 — Lokalisatie & vertaling (next-intl, EN + NL)
```

### 🔮 Fase 8 — Lange termijn
```
Epic 9   — Spotify mini player (OAuth + playback controls)
Epic 10  — Web migration C# desktop integraties (OBS relay agent)
Epic 2.3 — OBS & Spotify widgets in dashboard (via desktop app — minder urgent na Epic 10)
Epic 11  — Personal music player (na validatie van core platform)
```

---

## Ideeënlijst — nog niet ingepland

### [IDEA-1] Stream info beheren vanuit dashboard
Vanuit het dashboard stream info kunnen bewerken voor aangesloten kanalen (Twitch stream title/game, YouTube stream title/description). Directe API calls naar Twitch Helix (`PATCH /channels`) en YouTube Data API (`liveBroadcasts.update`). Vereist schrijf-scopes bij OAuth — controleren of die al aanwezig zijn.

### [IDEA-2] VOD- en videobeheer (Twitch + YouTube)
Een beheer-interface vergelijkbaar met YouTube Studio en Twitch VOD-manager. Gecombineerde "Content" sectie.

**YouTube:** volledig in-app — titels/beschrijvingen aanpassen, privacy instellen, miniaturen uploaden via `videos.update` + `thumbnails.set`.

**Twitch:** gedeeltelijk in-app — VOD-lijst ophalen via `GET /helix/videos`, titel + beschrijving bewerken via `PATCH /helix/videos`. Zichtbaarheid (public/private) is niet beschikbaar via de publieke API — knop "Manage on Twitch" opent `https://dashboard.twitch.tv/content/video-producer` direct.

### [IDEA-3] Custom OBS browser sources
Naast de goal-overlay ook andere "custom" browser sources aanbieden die streamers als OBS-bron kunnen toevoegen — bijv. evenement-tickers, chat-overlays, now-playing banners. Zelfde token-based widget authenticatie als [8.1]. Creators kiezen welke bronnen ze activeren en kopiëren de URL naar OBS.

### [IDEA-4] Alert-systeem voor events
Visuele alerts tonen wanneer er een event binnenkomt (follow, sub, bits, raid, superchat, member). Twee onderdelen:
- **Configuratie-UI** — alert-stijl, animatie, geluid, drempelwaarden instellen per event type
- **Alert-overlay widget** — `/widget/alerts` als OBS browser source; luistert via SSE of WebSocket en speelt de alert af

Bouwt voort op [8.1] widget-authenticatie en de bestaande SSE event feed.

> **Waarom deze volgorde?**
> YouTube is al half-gebouwd — 6.5 sluit de integratie af met minimale inspanning. OBS widgets zijn een concrete, visuele USP die makkelijk te demonstreren zijn in marketing materiaal. Analytics + Lemon Squeezy maken monetisatie mogelijk. Unified chat is complex maar de sterkste differentiator — die bouwt de grootste marketingboodschap op.

---

## Epic 2 — Live dashboard

> Items 2.1 (SSE events feed) and 2.2 (dashboard page) are complete. One item remains.

---

### [2.3] OBS & Spotify widget in dashboard

**Doel:** De huidige OBS scene en het spelende Spotify-nummer tonen in het dashboard, opgehaald vanuit de lokale C# desktop app.

**Claude Code prompt:**
```
I have a Next.js dashboard page. My local C# desktop app runs on localhost and has a small HTTP API.
Add two widgets to the dashboard:
1. "Now Playing" — fetches current Spotify track from http://localhost:PORT/spotify/current every 10 seconds and shows title + artist
2. "Current Scene" — fetches active OBS scene from http://localhost:PORT/obs/scene every 5 seconds and shows the scene name

Handle the case where the desktop app is not running (show "Desktop app offline" instead of crashing).
Use client-side fetching (useEffect + setInterval). Tailwind CSS styling.
```

---

## Epic 3 — Configuratie beheren

> Zorgt voor retentie — instellingen worden opgeslagen in de webapp zodat de desktop app ze kan ophalen.

---

### [3.1] Config schema in Neon

**Doel:** Een tabel aanmaken waar de configuratie van de gebruiker (commands, triggers, macro's) als JSON wordt opgeslagen.

**Claude Code prompt:**
```
I have a Next.js app with Drizzle ORM and Neon DB. Schema is in src/lib/schema.ts.
Users authenticate via Twitch OAuth (NextAuth). The users table has id (uuid) and twitchId (text).

Add a user_configs table to schema.ts:
- id (uuid, primaryKey, defaultRandom)
- userId (uuid, unique, notNull) — references users.id via .references(() => users.id)
- commands (json — array of chat command objects)
- triggers (json — array of event trigger objects)
- macros (json — array of macro objects)
- updatedAt (timestamp, defaultNow, notNull)

Show the schema addition and run: npx drizzle-kit push
```

---

### [3.2] Config API routes

**Doel:** API routes waarmee de webapp (en later de desktop app) de configuratie kan ophalen en opslaan.

**Claude Code prompt:**
```
I have a Next.js app with Drizzle ORM, Neon DB and NextAuth (Twitch OAuth).
The session contains session.twitchId. The users table has twitchId and id (uuid).
There is a user_configs table with userId (references users.id), commands, triggers, macros (all json).

Build two API routes using Next.js App Router:

GET /api/config
- Authenticate user via getServerSession
- Look up user by twitchId, then fetch their user_configs row
- Return the config (or empty defaults { commands: [], triggers: [], macros: [] } if none exists)

POST /api/config
- Authenticate user via getServerSession
- Accept JSON body { commands, triggers, macros }
- Upsert the user_configs row (insert or update on userId conflict)

Show the full route handlers.
```

---

### [3.3] Configuratie UI in de webapp

**Doel:** Een instellingenpagina waar gebruikers hun commands en triggers kunnen bekijken, toevoegen en verwijderen.

**Claude Code prompt:**
```
I have a Next.js app with an API route GET/POST /api/config that returns and saves user config as JSON.
The config has three sections: commands (array), triggers (array), macros (array).

Build a /settings page with three tabs (Commands, Triggers, Macros).
Each tab shows a table of existing items with a delete button per row, and a simple form to add a new item.

For Commands, the fields are: trigger (e.g. !hello), response (text), cooldown (seconds).
For Triggers, the fields are: event (follow|sub|bits|raid), action (send_chat|switch_scene|play_sound), value (string).
For Macros, the fields are: name, actions (comma-separated list of action IDs).

Use Tailwind CSS. Load config on mount, save on every add/delete.
```

---

### [3.4] Desktop app haalt config op uit de webapp

**Doel:** De C# desktop app haalt bij opstarten de configuratie op uit de Next.js API in plaats van lokale hardcoded instellingen.

**Claude Code prompt:**
```
I have a C# desktop app that currently uses hardcoded configuration for chat commands, event triggers and macros.
I have a Next.js API at https://my-app.com/api/config that returns user config as JSON (requires an Authorization: Bearer <token> header).

Add a ConfigService to the C# app that:
1. Reads an API token from a local config file (appsettings.json)
2. On startup, fetches the config from the API using HttpClient
3. Deserializes the JSON into typed C# classes (Command, Trigger, Macro)
4. Exposes the config to other services via dependency injection

Show the full ConfigService implementation and the model classes.
```

---

## Epic 4 — Analytics

> De killer feature die het abonnement rechtvaardigt. Streamers kunnen terugkijken op elke sessie.

---

### [4.1] Analytics API route

**Doel:** Een API route die geaggregeerde statistieken teruggeeft per dag en per sessie.

**Claude Code prompt:**
```
I have a Next.js app with Drizzle ORM and Neon DB. Users authenticate via NextAuth (session.twitchId = broadcasterId).
Tables: sub_events, follow_events, cheer_events, raid_events (all with broadcasterId, occurredAt), stream_sessions (broadcasterId, startedAt, endedAt).

Build an API route GET /api/analytics that:
- Authenticates the user via getServerSession
- Accepts query params: range (7d | 30d | 90d) and optionally sessionId
- Returns:
  - Total counts per event type (follow, sub, bits, raid) for the range
  - Events grouped by day (for chart rendering): { date, follows, subs, bits, raids }
  - List of sessions in the range with startedAt, endedAt, and per-type totals

Return as JSON. Use Drizzle queries (group by day using SQL date_trunc where needed).
```

---

### [4.2] Analytics pagina

**Doel:** Een overzichtspagina met grafieken van subs, follows, bits en raids over tijd.

**Claude Code prompt:**
```
I have a Next.js app with an API route /api/analytics that returns event totals grouped by day and by session.
Build an /analytics page with:
1. A date range selector (7 days / 30 days / 90 days)
2. Four summary cards: total follows, subs, bits, raids for the selected range
3. A bar chart (Recharts) showing daily event counts, with each event type as a stacked bar
4. A table of recent stream sessions with columns: date, duration, follows, subs, bits, raids

Use Tailwind CSS, dark theme consistent with the dashboard.
```

---

### [4.3] Sessie detail pagina

**Doel:** Een detailpagina per stream sessie met alle events in chronologische volgorde.

**Claude Code prompt:**
```
I have a Next.js app with Drizzle ORM and Neon DB.
Tables: stream_sessions (id, broadcasterId, startedAt, endedAt), sub_events, follow_events, cheer_events, raid_events (all with broadcasterId, occurredAt).

Build a /analytics/[sessionId] page that shows:
1. Session metadata: date, start time, end time, total duration
2. Summary cards: follows, subs, bits, raids totals for this session
3. A chronological timeline of all events in this session (time, type, fromUser, amount)
   - Filter each table by broadcasterId and occurredAt between startedAt and endedAt
   - Merge and sort all results by occurredAt

Fetch data server-side using Drizzle. Use Tailwind CSS, dark theme.
```

---

## Epic 5 — Monetisatie

> Pas aanpakken als epics 1–4 solide staan en je eerste externe gebruikers hebt.

---

### [5.1] Lemon Squeezy abonnement integreren

**Doel:** Gebruikers kunnen een maandelijks abonnement afsluiten via Lemon Squeezy Checkout.

**Claude Code prompt:**
```
I have a Next.js app with NextAuth (Twitch OAuth) and a users table in Neon (Drizzle ORM).
The users table is in src/lib/schema.ts and has id (uuid), twitchId (text, nullable), twitchLogin (text), twitchDisplayName (text), apiKey (text), createdAt (timestamp).
(twitchId may be nullable by this point if YouTube-only users exist — handle lookups accordingly.)

Integrate Lemon Squeezy for a monthly subscription:
1. Add subscriptionStatus (text, default "free") and LsCustomerId (text, nullable) to the users table in schema.ts
2. Build an API route POST /api/billing/checkout that creates a Lemon Squeezy Checkout session and redirects the user
3. Build an API route POST /api/billing/webhook that handles Lemon Squeezy webhooks:
   - checkout.session.completed → set subscriptionStatus to "pro"
   - customer.subscription.deleted → set subscriptionStatus back to "free"
4. Show the required environment variables and Lemon Squeezy dashboard setup steps

Use the official Lemon Squeezy Node.js SDK. Use Drizzle for all DB updates. Run: npx drizzle-kit push
```

---

### [5.2] Feature gates per abonnementslaag

**Doel:** Analytics en instellingen zijn alleen beschikbaar voor Pro gebruikers.

**Context:**
- Na Epic 6 kunnen gebruikers ook via YouTube inloggen (geen `twitchId`). Gebruik `session.twitchId ?? session.youtubeChannelId` als identifier en pas de DB lookup aan.

**Claude Code prompt:**
```
I have a Next.js app where users have a subscriptionStatus field ("free" | "pro") in the users table (Drizzle ORM, Neon DB).
Users can log in via Twitch (session.twitchId) or YouTube (session.youtubeChannelId).
Look up subscriptionStatus by: twitchId if session.twitchId is set, otherwise by youtubeChannelId.

Add a subscription check to the following:
1. /analytics page — redirect free users to /billing with a message explaining the feature requires Pro
2. /api/analytics route — return 403 with { error: "pro_required" } for free users
3. /settings page — show a paywall banner for free users, disable the save button

Show the middleware or page-level checks needed for Next.js App Router.
```

---

### [5.3] Billing pagina

**Doel:** Gebruikers kunnen hun abonnement bekijken en beheren.

**Claude Code prompt:**
```
I have a Next.js app with Lemon Squeezy integration. Users have a subscriptionStatus ("free" | "pro") and Lemon SqueezyCustomerId in the Drizzle users table.
Build a /billing page that shows:
1. Current plan (Free or Pro) with a description of what's included
2. For Pro users: next billing date (fetched from Lemon Squeezy API) and a "Manage subscription" button that opens Lemon Squeezy Customer Portal
3. For Free users: a pricing card with a "Upgrade to Pro — €10/month" button that triggers the Lemon Squeezy Checkout flow

Use Tailwind CSS, dark theme.
```

---

## Epic 6 — YouTube ondersteuning

> Maakt de tool bruikbaar voor YouTube-creators. YouTube heeft geen webhooks — events worden gepolled via de YouTube Data API v3. Equivalenten: Members = subs, Super Chats = bits, Subscribers = follows (read-only, geen real-time). Raids bestaan niet op YouTube.

---

### [6.1] Google OAuth toevoegen aan NextAuth

**Doel:** Gebruikers kunnen inloggen met hun Google/YouTube account naast of in plaats van Twitch, zodat de app hun YouTube-kanaal kan identificeren en de API kan aanroepen.

**Context:**
- NextAuth draait al met Twitch provider in `src/lib/auth.ts`
- De huidige `upsertUser()` functie matcht op `twitchId` — voor YouTube gebruikers is het matching-veld `youtubeChannelId`
- De bestaande `users` tabel heeft `twitchId` als `notNull()` — dit moet **nullable** worden zodat YouTube-only gebruikers een rij kunnen krijgen
- `access_type: "offline"` is **verplicht** in de Google provider authorization params om een refresh token te ontvangen
- `prompt: "consent"` forceer je tijdens development zodat Google bij elke login een refresh token stuurt (anders alleen bij eerste koppeling)
- De YouTube channel ID zit **niet** in het Google OAuth profile — die moet worden opgehaald via een extra API call: `GET https://www.googleapis.com/youtube/v3/channels?part=id&mine=true` met de access token

**Claude Code prompt:**
```
I have a Next.js app with NextAuth. The current provider is Twitch. Users are stored in a Neon DB (Drizzle ORM) users table with: id (uuid), twitchId (text, notNull), twitchLogin, twitchDisplayName, apiKey, createdAt. Schema is in src/lib/schema.ts, auth config in src/lib/auth.ts.

1. In schema.ts, make twitchId nullable (remove notNull()) and add:
   - youtubeChannelId (text, nullable, unique)
   - youtubeAccessToken (text, nullable)
   Run: npx drizzle-kit push

2. Add a Google provider to NextAuth in src/lib/auth.ts:
   - Scopes: openid, email, profile, https://www.googleapis.com/auth/youtube.readonly
   - Authorization params must include: access_type: "offline", prompt: "consent"
     (access_type: "offline" is required to receive a refresh token from Google)

3. In the signIn callback, handle provider === "google":
   - Call https://www.googleapis.com/youtube/v3/channels?part=id&mine=true with account.access_token to get the YouTube channel ID
     (The channel ID is NOT in the Google OAuth profile — it requires this extra API call)
   - Look up existing user by youtubeChannelId. If found: update youtubeAccessToken. If not found: insert a new user row with twitchId = null, youtubeChannelId, youtubeAccessToken, and a generated apiKey.
   - Do NOT match on email — the users table has no email field.

4. In the jwt callback, for Google provider: set token.youtubeChannelId from the DB row.

5. In the session callback, expose session.youtubeChannelId.

Required env vars: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
Show all changes to auth.ts, schema.ts, and the required .env additions.
```

---

### [6.2] YouTube-specifieke event tabellen

**Doel:** Aparte tabellen aanmaken voor YouTube Super Chats, Members en stream sessies — consistent met het bestaande Twitch-patroon.

**Context:**
- Bestaand patroon: aparte tabel per event type met `eventId` (unique) voor deduplicatie
- YouTube events hebben geen Twitch EventSub message ID — gebruik de `id` van het `liveChatMessage` object als `eventId`
- `channelId` is het equivalent van Twitch `broadcasterId`
- `amountMicros` komt uit de YouTube API als een **string** (niet een number) — gebruik `parseInt()` bij het inserten
- Drizzle's `bigint` vereist een mode: gebruik `bigint("amount_micros", { mode: "number" })`
- Geen equivalent voor Twitch raids op YouTube

**Claude Code prompt:**
```
I have a Next.js app with Drizzle ORM and Neon DB. Schema is in src/lib/schema.ts.
I need three new tables for YouTube streaming events, following the existing pattern (uuid pk, eventId unique, channelId instead of broadcasterId).

ytSuperChatEvents ("yt_superchat_events"):
- id (uuid, primaryKey, defaultRandom)
- channelId (text, notNull) — YouTube channel ID of the broadcaster
- eventId (text, unique, notNull) — liveChatMessage.id from YouTube API
- userId (text, nullable) — viewer's YouTube channel ID
- userDisplayName (text, nullable)
- amountMicros (bigint("amount_micros", { mode: "number" }), notNull) — amount in micros (divide by 1,000,000 for display)
  Note: YouTube API returns amountMicros as a string — parse with parseInt() before inserting
- currency (text, notNull) — ISO 4217 currency code, e.g. "EUR"
- message (text, nullable)
- occurredAt (timestamp, notNull)
- createdAt (timestamp, defaultNow, notNull)

ytMemberEvents ("yt_member_events"):
- id (uuid, primaryKey, defaultRandom)
- channelId (text, notNull)
- eventId (text, unique, notNull)
- userId (text, nullable)
- userDisplayName (text, nullable)
- memberMonths (integer, notNull) — total months of membership (1 = new member)
- levelName (text, nullable) — membership tier name
- occurredAt (timestamp, notNull)
- createdAt (timestamp, defaultNow, notNull)

ytStreamSessions ("yt_stream_sessions"):
- id (uuid, primaryKey, defaultRandom)
- channelId (text, notNull)
- broadcastId (text, notNull) — YouTube liveBroadcast.id
- title (text, nullable)
- startedAt (timestamp, notNull)
- endedAt (timestamp, nullable)
- createdAt (timestamp, defaultNow, notNull)

Show the additions to schema.ts and run: npx drizzle-kit push
```

---

### [6.3] YouTube token refresh opslaan bij OAuth

**Doel:** De YouTube refresh token opslaan tijdens OAuth zodat de poller verlopen access tokens kan vernieuwen zonder dat de gebruiker opnieuw hoeft in te loggen.

**Context:**
- Google geeft de `refresh_token` **alleen bij de eerste autorisatie** (of wanneer `prompt: "consent"` is ingesteld — zie [6.1])
- Sla hem direct op — bij latere logins is `account.refresh_token` undefined
- `youtubeRefreshToken` moet als apart veld in de `users` tabel
- Dit moet klaar zijn **vóór** [6.4] (de cron job gebruikt de refresh token)

**Claude Code prompt:**
```
I have a Next.js app with NextAuth and a Google/YouTube provider.
The users table has youtubeChannelId (text) and youtubeAccessToken (text), both nullable.

1. Add youtubeRefreshToken (text, nullable) to the users table in schema.ts.
   Run: npx drizzle-kit push

2. In the NextAuth signIn callback in src/lib/auth.ts, update the Google provider handling:
   - When account.provider === "google" and account.refresh_token is present, save it to users.youtubeRefreshToken
   - Only update youtubeRefreshToken when account.refresh_token is truthy — do NOT overwrite with null on subsequent logins
     (Google only sends refresh_token on first authorization or when prompt: "consent" is set)

Show the schema change and the NextAuth callback update.
```

---

### ✅ [6.4] YouTube Live Chat poller (Vercel Cron Job)

**Doel:** Een achtergrondservice die regelmatig actieve YouTube-uitzendingen opzoekt, de live chat ophaalt en Super Chats + membership events opslaat.

**Context:**
- YouTube heeft geen webhooks voor live events — polling is de enige optie
- YouTube Data API v3 geeft bij `liveChatMessages.list` een `pollingIntervalMillis` terug — respecteer dit interval (minimaal 5 seconden, typisch 15–60 s)
- Vercel Cron Jobs kunnen maximaal elke minuut draaien (`"* * * * *"`) — voldoende voor live chat
- De cron job haalt `youtubeAccessToken` en `youtubeRefreshToken` op per actieve gebruiker (iedereen met `youtubeChannelId IS NOT NULL`)
- Token refresh: gebruik `youtubeRefreshToken` (toegevoegd in [6.3]) om verlopen tokens te vernieuwen via `https://oauth2.googleapis.com/token`
- Deduplicatie via `onConflictDoNothing()` op `eventId` — safe om dubbel te runnen

**Claude Code prompt:**
```
I have a Next.js app (Vercel) with Drizzle ORM, Neon DB. Users can have a youtubeChannelId, youtubeAccessToken, and youtubeRefreshToken in the users table.
I have yt_superchat_events and yt_member_events tables (schema already added in a previous step).
I also have a yt_stream_sessions table.

Build a Vercel Cron Job at /api/cron/youtube-poll that:

1. Runs every minute (configure in vercel.json: { "crons": [{ "path": "/api/cron/youtube-poll", "schedule": "* * * * *" }] })
2. Protect it with a CRON_SECRET header check (compare Authorization: Bearer <CRON_SECRET>)
3. Fetches all users from the DB where youtubeChannelId IS NOT NULL and youtubeAccessToken IS NOT NULL
4. For each user:
   a. Call YouTube Data API: GET https://www.googleapis.com/youtube/v3/liveBroadcasts?part=id,snippet,status&broadcastStatus=active&mine=true
      - If no active broadcast: ensure any open yt_stream_sessions row for this channelId has endedAt set
      - If active broadcast found: upsert a yt_stream_sessions row (insert if broadcastId not exists, skip if already open)
   b. Get the liveChatId from the active broadcast snippet
   c. Call YouTube Data API: GET https://www.googleapis.com/youtube/v3/liveChatMessages?part=id,snippet,authorDetails&liveChatId=<id>&maxResults=200
      - Filter messages where snippet.type == "superChatEvent": insert into yt_superchat_events
        Fields: eventId = message.id, userId = authorDetails.channelId, userDisplayName = authorDetails.displayName,
                amountMicros = parseInt(snippet.superChatDetails.amountMicros), currency = snippet.superChatDetails.currency,
                message = snippet.superChatDetails.userComment, occurredAt = snippet.publishedAt
      - Filter messages where snippet.type == "memberMilestoneChatEvent" or "newSponsorEvent": insert into yt_member_events
        Fields: eventId = message.id, userId = authorDetails.channelId, userDisplayName = authorDetails.displayName,
                memberMonths = snippet.memberMilestoneChatDetails?.memberMonth ?? 1,
                levelName = snippet.memberMilestoneChatDetails?.memberLevelName ?? null,
                occurredAt = snippet.publishedAt
   d. All inserts use .onConflictDoNothing() on eventId
   e. If any API call returns 401, attempt token refresh:
      - POST https://oauth2.googleapis.com/token with grant_type=refresh_token and the user's youtubeRefreshToken
      - Update users.youtubeAccessToken in the DB with the new token
      - Retry the failed API call once

Handle errors per-user (log and continue to next user rather than failing the whole job).
Show the full route handler and vercel.json cron config.
Required env vars: CRON_SECRET, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
```

---

### ✅ [GOALS] Multi-platform goals — DONE
> Implemented: goals table with type discriminator, Twitch follow + YouTube member goals, three-card dashboard UI, goals page.

---

### [6.5] SSE stream uitbreiden voor YouTube (live feed real-time)

**Doel:** De bestaande realtime event feed en dashboard pagina uitbreiden zodat YouTube events (Super Chats, Members) naast Twitch events worden getoond.

**Context:**
- Epic [2.1] bouwt een SSE route die Twitch tabellen pollt — dit moet worden uitgebreid met de YouTube tabellen
- De genormaliseerde event shape `{ id, type, fromUser, amount, occurredAt, platform }` krijgt een nieuw veld `platform` ('twitch' | 'youtube') zodat het dashboard een platform-icoontje kan tonen
- Sign-in URL voor YouTube koppelen: gebruik `/api/auth/signin/google` (niet `?provider=google`) of roep `signIn('google')` aan via `next-auth/react`

**Claude Code prompt:**
```
I have a Next.js app. Users can be authenticated via Twitch (session.twitchId) or YouTube (session.youtubeChannelId), or both.

I have an existing SSE route at /api/events/stream that polls Twitch event tables (sub_events, follow_events, cheer_events, raid_events) and streams normalised events.

Update the SSE route to also poll YouTube tables (yt_superchat_events, yt_member_events) and include their events in the stream:
- yt_superchat_events: type = "superchat", fromUser = userDisplayName, amount = amountMicros / 1_000_000, platform = "youtube"
- yt_member_events: type = "member", fromUser = userDisplayName, amount = memberMonths, platform = "youtube"

The normalised event shape becomes: { id, type, fromUser, amount, occurredAt, platform }
Existing Twitch events get platform = "twitch".

Only query YouTube tables if session.youtubeChannelId is set. Use channelId = session.youtubeChannelId as the filter.

Also update the /dashboard page:
1. Add a platform badge (T / YT icon) next to each event in the live feed
2. Show active session info for whichever platform(s) are live:
   - Twitch: open row in stream_sessions for this twitchId
   - YouTube: open row in yt_stream_sessions for this youtubeChannelId (show broadcast title if available)
3. If session.youtubeChannelId is null, show a "Connect YouTube" button.
   Use a client component with: import { signIn } from "next-auth/react" → onClick={() => signIn("google")}
   Do NOT use /api/auth/signin?provider=google — that URL format does not work in NextAuth.

Show the updated SSE route and the dashboard page changes.
```

---

### [6.6] Analytics uitbreiden voor YouTube

**Doel:** De analytics API en pagina ook YouTube events tonen, zodat creators hun Super Chat inkomsten en membership groei kunnen terugkijken.

**Context:**
- Epic [4.1] bouwt `/api/analytics` voor Twitch events — voeg YouTube events toe
- Super Chat `amountMicros` omrekenen naar echte bedragen per valuta — toon een totaalbedrag per valuta (niet per se omrekenen naar EUR/USD)
- Members zijn het YouTube-equivalent van subs

**Claude Code prompt:**
```
I have a Next.js app with a GET /api/analytics route that returns Twitch event totals grouped by day.
I now also have YouTube tables: yt_superchat_events (amountMicros bigint, currency, channelId, occurredAt), yt_member_events (channelId, occurredAt), yt_stream_sessions (channelId, startedAt, endedAt, title).

Update /api/analytics to also return YouTube data when session.youtubeChannelId is set:
- ytSuperchats: total count and totals per currency (e.g. { EUR: 45.50, USD: 12.00 }) for the selected range
  (amountMicros is stored as integer — divide by 1,000,000 for display values)
- ytMembers: total count for the range
- Combined daily breakdown: add ytSuperchats and ytMembers columns to the per-day array

Update the /analytics page:
1. Add two new summary cards: "Super Chats" (total count + total amount per currency) and "Members" (total count)
2. Add ytSuperchats and ytMembers as stacked bar segments in the existing Recharts bar chart
3. In the sessions table, show YouTube sessions (from yt_stream_sessions) alongside Twitch sessions, with a platform badge

Show the updated API route and page.
```

---

### [GOALS] Multi-platform event goals

**Doel:** Expand the current Twitch sub goal into a flexible goals system that supports one active goal per event type across all connected platforms — not just Twitch subs.

**Motivatie:**
The current sub goal is Twitch-only and sub-only. Creators increasingly care about follower milestones, YouTube member counts, and cheer/bits targets alongside subs. A generalised goals system lets them track what actually matters to them on any given stream.

**Scope — one goal per event type, not a goal builder:**
- Each supported event type gets its own goal slot (e.g. Twitch Subs, Twitch Follows, YouTube Members)
- Only one active goal per slot at a time — same UX as today, just more slots
- Goal slots are only visible/configurable once the relevant platform is connected

**Event types to support (phased with platform epics):**
- Twitch: Subscriptions ✅ (exists), Follows, Cheers (bits)
- YouTube: Members, Super Chats (after Epic 6)

**Architectuuroverwegingen:**
- Current `sub_goals` table is Twitch-sub-specific — needs to be generalised or a new `goals` table introduced with a `type` discriminator column (e.g. `twitch_sub`, `twitch_follow`, `youtube_member`)
- The OBS overlay output file and the C# bot that writes it are tied to the sub goal — those also need to support the new types
- Dashboard UI should render each active goal as its own card, not cram them all into one

**Afhankelijkheden:** Epic 6 (YouTube) for YouTube goal types. Twitch follow/cheer goals can be built independently.

---

## Epic 7 — Unified chat view (USP)

> **Marketing hook:** "All your chats, one screen." Multi-platform streamers currently juggle separate browser tabs for Twitch chat, YouTube live chat, and others — mid-stream. CreatorDeck solves this with a single chronological feed that shows every message regardless of source, with a coloured platform badge so the streamer always knows where a message came from. No other mainstream stream management tool offers this out of the box.

> **Afhankelijkheden:** Epic 6 (YouTube OAuth + chat poller). Twitch chat kan parallel worden gebouwd.

---

### [7.1] Twitch chat inlezen via EventSub

**Doel:** Subscribe to the `channel.chat.message` EventSub event type so Twitch chat messages flow into the backend in real time via webhook, consistent with the existing EventSub infrastructure.

**Context:**
- `channel.chat.message` requires an additional EventSub subscription — add it to the register-subscriptions flow
- Payload includes: `chatter_user_name`, `message.text`, `message_id`, `badges`, `message_type`
- Store messages in a new `chat_messages` table (see [7.2]) and forward to the SSE stream

---

### [7.2] `chat_messages` tabel toevoegen aan schema

**Doel:** Centrale tabel voor alle chat berichten ongeacht platform.

**Schema:**
```
chat_messages
- id (uuid, primaryKey, defaultRandom)
- broadcasterId (text, notNull)
- source (text, notNull) — "twitch" | "youtube" | "tiktok"
- externalMessageId (text, unique, notNull) — platform-specific message ID for deduplication
- username (text, notNull)
- text (text, notNull)
- badges (text, nullable) — JSON array of badge names
- occurredAt (timestamp, notNull)
- createdAt (timestamp, defaultNow, notNull)
```

---

### [7.3] YouTube chat doorsturen naar `chat_messages`

**Doel:** Berichten die binnenkomen via de YouTube chat poller (Epic 6.4) worden ook opgeslagen in `chat_messages` met `source = "youtube"`, zodat de unified feed beide platforms toont.

**Context:**
- YouTube chat poller haalt `liveChatMessages` op — map `authorDetails.displayName` → `username`, `snippet.displayMessage` → `text`, `id` → `externalMessageId`
- Super Chats en memberships zijn ook chat message types in de YouTube API — markeer ze met een badge

---

### [7.4] SSE stream uitbreiden met chat events

**Doel:** Chat berichten worden via de bestaande SSE endpoint naar de frontend gepusht als een nieuw event type `chat`, zodat de frontend real-time updates ontvangt zonder polling.

**Context:**
- Huidig SSE stream levert `sub`, `follow`, `bits`, `raid` events — voeg `chat` toe als type
- Chat volume kan hoog zijn — overweeg client-side buffering (max 200 berichten in memory, oudste vallen eraf)

---

### [7.5] Unified chat UI in het dashboard

**Doel:** Een chatvenster in het dashboard dat berichten van alle platforms toont in één chronologische feed.

**UX-vereisten:**
- Per bericht: platform badge (gekleurd naar bron — paars Twitch, rood YouTube), gebruikersnaam, berichttekst, tijdstip
- Scrollt automatisch mee met nieuwe berichten, maar pauzeert scrollen als de gebruiker omhoog scrollt
- Filteroptie per platform (toggle Twitch / YouTube aan/uit)
- Maximaal ~200 berichten in de weergave; oudste worden verwijderd
- Moderatieacties (ban, timeout, bericht verwijderen) zijn een follow-up feature — buiten scope voor v1

---

### [7.6] Connections pagina uitbreiden met YouTube-specifieke info

**Doel:** De connections pagina toont momenteel voor Twitch uitgebreide info (EventSub status, webhook URL, re-register knop). Voor YouTube ontbreekt dit nog. Voeg vergelijkbare relevante info toe voor het YouTube account.

**Te implementeren:**
- YouTube channel ID en kanaallink tonen naast de display naam
- Status van de YouTube live chat poller (actief / inactief) zodra die gebouwd is
- Eventueel: subscriber count via YouTube Data API

**Context:**
- YouTube account info zit in `linked_accounts` tabel (provider = "youtube")
- YouTube-specifieke UI component analoog aan `TwitchManage` bouwen als `YouTubeManage`

---

### [7.7] TikTok chat (toekomstig — buiten scope v1)

**Doel:** TikTok live chat toevoegen aan de unified feed.

**Status:** TikTok heeft geen officiële live chat API voor derde partijen. Dit item blijft geparkeerd totdat TikTok een API openstelt of een betrouwbare officiële integratiemethode beschikbaar komt. Geen third-party scrapers — te fragiel en ToS-risico.

---

---

## [UX] Guided onboarding flow

> **Priority: high** — affects every new user. Bad onboarding kills otherwise great tools. A setup wizard that walks the user through connecting Twitch, registering EventSub, and understanding the dashboard reduces abandonment and removes the current reliance on the user finding the Connections page themselves.

**Current problem:**
New users land on the dashboard with no guidance. EventSub registration is buried in Connections → Twitch → expand webhook section. If they skip it, the live feed is silent and the experience feels broken.

**Proposed flow (step-by-step wizard, shown once on first login):**
1. **Welcome** — brief intro to what CreatorDeck does, what to expect
2. **Twitch connected** ✓ — confirm their Twitch account is linked (already done via OAuth)
3. **Register EventSub** — single button, inline status feedback, cannot skip
4. **All set** — direct them to the dashboard with a short explanation of each section

**Implementation notes:**
- Track completion with a `onboardingCompleted` boolean on the `users` table
- Show the wizard as a full-screen overlay or a dedicated `/setup` route on first login
- Once completed, never show again (unless explicitly reset via account settings)
- The existing amber "Action required" banner on the dashboard acts as a fallback for users who somehow bypass the wizard

---

## [BUG] ✅ Investigate backfill inserting already-present events

> **Resolved** — sub backfill now uses `findTrackedUserIds` to skip users already recorded by live webhooks, matching the guard already in place for follow backfill.

---

## [UX] Platform audience pills

> **Priority: medium** — quick visual signal of channel health. Gives the streamer a glanceable snapshot of their audience size and momentum without leaving the dashboard.

**What it is:**
A row of small pills in the dashboard — one per connected platform — each showing:
- The platform icon
- Current follower count (Twitch, YouTube) or subscriber count (YouTube channels that surface it)
- A growth indicator: `+N` new in the last 30 days, coloured green for positive, grey for flat

**Per-platform data sources:**
- **Twitch** — follower count from `GET /helix/channels/followers` (broadcaster token, `moderator:read:followers` scope already present). Growth derived from counting `follow_events` rows in the last 30 days.
- **YouTube** — subscriber count from YouTube Data API `channels.list` (requires Epic 6 YouTube OAuth). Growth from YouTube Analytics API or local `youtube_events` table once Epic 6 is done.

**Implementation notes:**
- Twitch pill can be built independently of Epic 6 — only needs the existing Twitch token
- YouTube pill is gated on Epic 6 (YouTube OAuth). Show a "Connect YouTube" prompt in the pill slot until connected.
- Follower count is fetched server-side at page load (not live-updated — a refresh is fine)
- Growth number is computed from the local DB event tables, so no extra API call needed
- Pills live in the welcome/status card already on the dashboard, or as a dedicated row above the event feed

---

## Epic 8 — OBS browser source widget

> **Priority: high, effort: low** — a browser source is a URL OBS loads in a Chromium window. No new integrations needed; it surfaces data already in the system. A chat overlay powered by CreatorDeck's unified feed is a strong USP that ties directly into Epic 7.

**What it is:**
A set of `/widget/*` routes that render minimal, transparent-background UI designed to be loaded as OBS browser sources. The streamer copies the URL from CreatorDeck, pastes it into OBS as a browser source, and it just works.

---

### [8.1] Widget authentication

**Doel:** Allow widget routes to authenticate without a browser session, since OBS browser sources don't share cookies with the user's browser.

**Approach:**
- Generate a per-user widget token (a short-lived or long-lived signed token stored in the `users` table)
- Widget routes accept `?token=<widgetToken>` as a query param and resolve the broadcaster from it
- Token can be regenerated from the Connections or Account page

---

### [8.2] Chat overlay widget (`/widget/chat`)

**Doel:** A transparent, overlay-ready chat feed showing messages from all connected platforms, styled to sit over stream footage in OBS.

**UX requirements:**
- Transparent background (no card or border)
- Messages animate in from the bottom and fade out after a configurable duration (e.g. 8 seconds)
- Font size and colours configurable via URL params (`?fontSize=18&color=white`)
- Platform badge per message (Twitch purple, YouTube red)
- No scrollbar — messages flow and disappear automatically

**Afhankelijkheden:** Epic 7 (unified chat feed), [8.1] widget auth

---

### [8.3] Goal overlay widget (`/widget/goal`)

**Doel:** A progress bar overlay for the current active goal (sub count, followers, etc.), suitable for placing at the bottom or side of a stream.

**UX requirements:**
- Transparent background
- Animated progress bar that updates live
- Configurable: label, colours, bar orientation (horizontal/vertical) via URL params
- Pulls from the same goal data as the dashboard

**Afhankelijkheden:** [8.1] widget auth

---

## Epic 9 — Spotify mini player

> **Priority: medium** — natural next step once the Spotify connection is live (Epic 6 area). Requires Spotify Premium on the user's account for the Web Playback SDK.

**What it is:**
An embedded Spotify player in the dashboard with full playback controls — play, pause, skip, volume — without leaving CreatorDeck.

---

### [9.1] Spotify OAuth connection

**Doel:** Allow users to connect their Spotify account to CreatorDeck via OAuth, storing access and refresh tokens in the `users` table.

**Context:**
- Spotify uses standard OAuth 2.0 with PKCE — add as a NextAuth provider or implement the OAuth flow manually
- Scopes needed: `user-read-playback-state`, `user-modify-playback-state`, `user-read-currently-playing`, `streaming`
- Store `spotifyAccessToken` and `spotifyRefreshToken` in the users table; token expires after 1 hour — implement refresh logic

---

### [9.2] Now Playing API route

**Doel:** A backend route that fetches the currently playing track from Spotify and returns it to the frontend.

**Endpoint:** `GET /api/spotify/now-playing`
- Fetches from Spotify Web API: `GET https://api.spotify.com/v1/me/player/currently-playing`
- Returns: `{ track, artist, albumArt, progress, duration, isPlaying }` or `null` if nothing is playing
- Handles token refresh transparently

---

### [9.3] Playback control API routes

**Doel:** API routes that proxy playback commands to Spotify.

**Endpoints:**
- `POST /api/spotify/play` — resume playback
- `POST /api/spotify/pause` — pause playback
- `POST /api/spotify/skip` — skip to next track
- `POST /api/spotify/previous` — go to previous track
- `POST /api/spotify/volume` — set volume (body: `{ volume: 0–100 }`)

All routes authenticate the user via session, fetch their Spotify token, and forward the command to the Spotify Web API.

---

### [9.4] Mini player UI in the dashboard

**Doel:** A compact player widget in the dashboard showing the current track with playback controls.

**UX requirements:**
- Album art thumbnail, track name, artist name
- Progress bar showing current position (updates every second client-side)
- Play/pause, skip, previous buttons
- Volume slider
- "Not playing" state when Spotify is idle
- Collapsed by default on mobile; full width on desktop

---

## Epic 10 — Web migration of C# desktop integrations (strategic)

> **Priority: medium-long term** — removes the dependency on the local C# desktop app, making CreatorDeck fully browser-based. This is a phased migration: Spotify first (already handled in Epic 9), then Twitch (already in the web), leaving OBS as the most complex piece.

**Why:**
The C# app requires the user to run a local process, configure file paths, and keep it updated separately. Moving integrations to the web makes CreatorDeck work from any machine with no install.

**Phased approach:**

### [10.1] OBS integration via WebSocket proxy

**Doel:** Allow the web dashboard to control OBS (switch scenes, toggle sources, start/stop recording) without the C# app acting as a middleman.

**The challenge:**
OBS WebSocket is a local WebSocket server — browsers cannot connect to it directly due to mixed-content and CORS restrictions. Two options:
1. **Local relay agent** — a tiny standalone background process (Go or Node, single binary, no UI) that bridges OBS WebSocket to a cloud WebSocket endpoint. Much lighter than the full C# app.
2. **OBS Remote via cloud** — use a service like OBS.Ninja or a self-hosted relay. More infrastructure complexity.

**Recommendation:** Local relay agent approach — minimal install, single binary, auto-starts with the OS. Eliminates the full C# app while keeping the OBS connection local where it must be.

### [10.2] Retire C# desktop app

**Doel:** Once OBS is handled by the relay agent and Spotify/Twitch run through the web, deprecate and archive the C# desktop app.

**Afhankelijkheden:** Epic 9 (Spotify), [10.1] (OBS relay)

---

## Epic 11 — Personal music player (future exploration)

> **Priority: low / future** — a genuinely unique feature but a significant infrastructure investment. Park until the core platform has traction and there is clear user demand.

**The idea:**
A built-in music player for the creator's own copyright-free music library, playable directly from CreatorDeck during streams. Includes analysis and smart grouping of tracks by mood, energy, or BPM so the streamer can pick the right vibe without manually curating playlists.

**Infrastructure requirements:**
- File storage for audio files (S3 or Cloudflare R2 — R2 has no egress fees, better for streaming)
- Audio streaming endpoint (range requests for seeking)
- Metadata extraction on upload: ID3 tags (title, artist, BPM, duration) + optional AI-based mood/energy classification
- Playlist management: create, reorder, shuffle

**Smart grouping options:**
- Rule-based: group by BPM range (chill < 90 BPM, energetic > 130 BPM), by genre tag
- AI-based: embed tracks using an audio ML model (e.g. Essentia) and cluster by similarity — requires a compute step on upload, not trivial
- Start with rule-based; AI grouping is a v2 enhancement

**Afhankelijkheden:** None from other epics, but should only be built after the core platform (Epics 1–7) is solid and user-validated.

---

## Epic 12 — Localization & translation

> **Priority: medium** — CreatorDeck's audience is international. The backlog is written in Dutch and the codebase has hardcoded English UI strings. Proper i18n opens the product to non-English streamers and makes future locale additions trivial.

**Scope:**
- Externalize all UI strings (dashboard, connections, setup wizard, landing page) into locale files
- Support at minimum: English (`en`) and Dutch (`nl`)
- Locale detection: browser `Accept-Language` header as default, user-overridable via account settings
- Date/time and number formatting should respect locale (e.g. `toLocaleString`)

**Recommended approach:**
- Use `next-intl` — integrates cleanly with Next.js App Router, supports server and client components, minimal boilerplate
- Locale files as JSON under `messages/en.json`, `messages/nl.json`
- No database changes needed for locale preference — store in a cookie or user settings row

**Afhankelijkheden:** None — can be done in any order, but easier before the UI grows further.

---

## [UX] Spotify queue — rectangle mini cards

**Omschrijving:** Turn the individual songs in the Spotify queue (up next panel) into mini cards styled as rectangles. Each song in the queue should be its own visually distinct card (rectangular shape) rather than a plain list item.

**Aandachtspunten:**
- Keep the horizontal overflow scroll behaviour that's already in place
- Consistent card sizing so the queue feels scannable at a glance
- Match the existing Spotify panel colour palette / dark theme

**Afhankelijkheden:** Epic 9 (Spotify mini player) — queue panel already exists.

---

## [BUG] YouTube cron returning HTTP 400

**Omschrijving:** Investigate why the YouTube Live Chat poller cron job (cron-job.org) is returning an HTTP 400 response. Determine whether the error originates from the cron trigger hitting the Next.js API route, or from a downstream call to the YouTube Data API v3.

**Aandachtspunten:**
- Check the poll-chat API route for request validation issues
- Verify the `Authorization` / `CRON_SECRET` header is still correct in cron-job.org config
- Inspect YouTube API error body — 400 could be an invalid `liveChatId`, expired token, or malformed request
- Check if `yt_stream_sessions` has a stale/invalid active session that causes a bad API call

**Afhankelijkheden:** Epic 6.4 (YouTube Live Chat poller).

---

*Backlog gecorrigeerd op basis van werkelijke codebase: Next.js + Neon DB + **Drizzle ORM** + NextAuth Twitch OAuth (webapp) en C# desktop app met OBS, Spotify en Twitch integraties. EventSub webhooks (geen polling). Bestaande tabellen: `users`, `sub_events`, `sub_goals`, `eventsub_subscriptions`.*
