import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"

import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { streamSessions } from "@/lib/schema"

import {
  followEventsRepository,
  subEventsRepository,
  cheerEventsRepository,
  raidEventsRepository,
  ytSuperChatEventsRepository,
  ytMemberEventsRepository,
  streamSessionRepository,
} from "@/repositories"

/** Returns a Date N days, H hours, M minutes in the past */
function ago(days: number, hours = 0, mins = 0): Date {
  return new Date(Date.now() - ((days * 24 + hours) * 60 + mins) * 60 * 1000)
}

/**
 * Distributes `count` timestamps quadratically between `minDays` and `maxDays`
 * ago, so events cluster toward the recent end. Hour offset cycles to spread
 * events across different times of day.
 */
function historyTimestamps(count: number, minDays: number, maxDays: number): Date[] {
  return Array.from({ length: count }, (_, i) => {
    const t = count > 1 ? i / (count - 1) : 0
    const days = minDays + Math.round(t * t * (maxDays - minDays))
    const hours = (i * 7) % 20
    return ago(days, hours)
  })
}

export async function POST() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 404 })
  }

  const session = await getServerSession(authOptions)
  if (!session?.twitchId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const broadcasterId = session.twitchId
  const channelId = session.youtubeChannelId ?? "UC_dev_seed_channel"
  const results: Record<string, number | string> = { channelId }

  // ── DASHBOARD FEED ──────────────────────────────────────────────────────────
  // 15 events within the last 90 minutes, interleaved across all 6 types and
  // both platforms. These will be the 15 most-recent events in the DB as long
  // as the old seed scripts haven't been run after this one.
  try {
    // 1. Follow — 2m ago (Twitch)
    await followEventsRepository.insert({ broadcasterId, eventId: "seed-full-recent-follow-1", userId: "fake-full-recent-f1", userLogin: "neondrifter_tv", userDisplayName: "NeonDrifter_TV", occurredAt: ago(0, 0, 2) })
    // 2. Super Chat $10 USD — 5m ago (YouTube)
    await ytSuperChatEventsRepository.insert({ channelId, eventId: "seed-full-recent-sc-1", userId: "UCfull-cosmicvibes", userDisplayName: "CosmicVibes", amountMicros: 10_000_000, currency: "USD", message: "Let's gooo!", occurredAt: ago(0, 0, 5) })
    // 3. Sub new T2 — 9m ago (Twitch)
    await subEventsRepository.insert({ broadcasterId, eventId: "seed-full-recent-sub-1", userId: "fake-full-recent-s1", userLogin: "pixelknight88", userDisplayName: "PixelKnight88", tier: "2000", kind: "new", giftCount: 1, occurredAt: ago(0, 0, 9) })
    // 4. Bits 500 — 13m ago (Twitch)
    await cheerEventsRepository.insert({ broadcasterId, eventId: "seed-full-recent-bits-1", userId: "fake-full-recent-b1", userLogin: "thundercheerer", userDisplayName: "ThunderCheerer", bits: 500, message: "Cheer500 keep it up!", isAnonymous: false, occurredAt: ago(0, 0, 13) })
    // 5. Member 3 months "Member" — 18m ago (YouTube)
    await ytMemberEventsRepository.insert({ channelId, eventId: "seed-full-recent-member-1", userId: "UCfull-loyalfan", userDisplayName: "LoyalFan", memberMonths: 3, levelName: "Member", occurredAt: ago(0, 0, 18) })
    // 6. Follow — 24m ago (Twitch)
    await followEventsRepository.insert({ broadcasterId, eventId: "seed-full-recent-follow-2", userId: "fake-full-recent-f2", userLogin: "shadowstream", userDisplayName: "ShadowStream", occurredAt: ago(0, 0, 24) })
    // 7. Raid 234 viewers — 29m ago (Twitch)
    await raidEventsRepository.insert({ broadcasterId, eventId: "seed-full-recent-raid-1", fromBroadcasterId: "fake-full-recent-r1", fromBroadcasterLogin: "retrogamevault", fromBroadcasterDisplayName: "RetroGameVault", viewerCount: 234, occurredAt: ago(0, 0, 29) })
    // 8. Super Chat €5 EUR — 35m ago (YouTube)
    await ytSuperChatEventsRepository.insert({ channelId, eventId: "seed-full-recent-sc-2", userId: "UCfull-nightbloom", userDisplayName: "NightBloom", amountMicros: 5_000_000, currency: "EUR", message: "Amazing stream!", occurredAt: ago(0, 0, 35) })
    // 9. Sub resub T1 12 months — 41m ago (Twitch)
    await subEventsRepository.insert({ broadcasterId, eventId: "seed-full-recent-sub-2", userId: "fake-full-recent-s2", userLogin: "ogviewer", userDisplayName: "OGViewer", tier: "1000", kind: "resub", giftCount: 1, cumulativeMonths: 12, message: "12 months and counting!", occurredAt: ago(0, 0, 41) })
    // 10. Member 6 months "Fan" — 48m ago (YouTube)
    await ytMemberEventsRepository.insert({ channelId, eventId: "seed-full-recent-member-2", userId: "UCfull-vaultkeeper", userDisplayName: "VaultKeeper", memberMonths: 6, levelName: "Fan", occurredAt: ago(0, 0, 48) })
    // 11. Bits 1000 — 55m ago (Twitch)
    await cheerEventsRepository.insert({ broadcasterId, eventId: "seed-full-recent-bits-2", userId: "fake-full-recent-b2", userLogin: "cheerbot_247", userDisplayName: "CheerBot_247", bits: 1000, message: "Cheer1000", isAnonymous: false, occurredAt: ago(0, 0, 55) })
    // 12. Follow — 63m ago (Twitch)
    await followEventsRepository.insert({ broadcasterId, eventId: "seed-full-recent-follow-3", userId: "fake-full-recent-f3", userLogin: "arcadewatcher", userDisplayName: "ArcadeWatcher", occurredAt: ago(0, 0, 63) })
    // 13. Sub gift x5 — 71m ago (Twitch)
    await subEventsRepository.insert({ broadcasterId, eventId: "seed-full-recent-sub-3", userId: null, userLogin: null, userDisplayName: null, gifterId: "fake-full-recent-g1", gifterLogin: "biggifter", gifterDisplayName: "BigGifter", tier: "1000", kind: "community_gift", giftCount: 5, occurredAt: ago(0, 0, 71) })
    // 14. Super Chat £25 GBP — 80m ago (YouTube)
    await ytSuperChatEventsRepository.insert({ channelId, eventId: "seed-full-recent-sc-3", userId: "UCfull-generousdan", userDisplayName: "GenerousDan", amountMicros: 25_000_000, currency: "GBP", message: "Here's a big one!", occurredAt: ago(0, 0, 80) })
    // 15. Follow — 90m ago (Twitch)
    await followEventsRepository.insert({ broadcasterId, eventId: "seed-full-recent-follow-4", userId: "fake-full-recent-f4", userLogin: "vortexgaming", userDisplayName: "VortexGaming", occurredAt: ago(0, 0, 90) })
    results.recentEvents = 15
  } catch (err) {
    results.recentEvents_error = String(err)
  }

  // ── HISTORY FOLLOWS (50 events, days 3–30, front-loaded) ───────────────────
  try {
    const followPool: [string, string][] = [
      ["glacierwave", "GlacierWave"],     ["neonpixel_x", "NeonPixel_X"],      ["voidrunner99", "VoidRunner99"],
      ["starblast_tv", "StarBlast_TV"],   ["duskwarden", "DuskWarden"],         ["ironclad_gg", "IronClad_GG"],
      ["luminary_q", "Luminary_Q"],       ["cryoknight_c", "CryoKnight"],       ["solarpunk_s", "SolarPunk_S"],
      ["blitzcaster", "BlitzCaster"],     ["warpgate_w", "WarpGate_W"],         ["frostbyte_f", "FrostByte_F"],
      ["orbitalray", "OrbitalRay"],       ["cascadeflow", "CascadeFlow"],       ["hypernova_h", "HyperNova_H"],
      ["vexillum_v", "Vexillum_V"],       ["quantumrift", "QuantumRift"],       ["echostrike_e", "EchoStrike_E"],
      ["nebulacrest", "NebulaCrest"],     ["darkpulse_d", "DarkPulse_D"],       ["staticbloom", "StaticBloom"],
      ["cobraxstyle", "CobraXStyle"],     ["titanshield", "TitanShield"],       ["dawnseeker_d", "DawnSeeker_D"],
      ["riftwalker_r", "RiftWalker_R"],   ["stormchaser_", "StormChaser_"],     ["cinderblaze_", "CinderBlaze_"],
      ["hexadrifter", "HexaDrifter"],     ["lumenwarden", "LumenWarden"],       ["galacticsoul", "GalacticSoul"],
      ["techprowler_", "TechProwler_"],   ["aurorashade", "AuroraShade"],       ["cyberghostgg", "CyberGhostGG"],
      ["prismatix_p", "Prismatix_P"],     ["ironwolftv_", "IronWolfTV_"],       ["phaserbolt_p", "PhaserBolt_P"],
      ["veloxstream", "VeloxStream"],     ["deepvoidtv_", "DeepVoidTV_"],       ["novaflare_nx", "NovaFlare_NX"],
      ["crystalshiv", "CrystalShiv"],     ["hyperlink_hl", "HyperLink_HL"],    ["spectralrun_", "SpectralRun_"],
      ["binaryghst_b", "BinaryGhst_B"],   ["zerophase_z", "ZeroPhase_Z"],      ["plasmacoil_p", "PlasmaCoil_P"],
      ["synthwave_sw", "SynthWave_SW"],   ["runicblade_r", "RunicBlade_R"],    ["starwarden_s", "StarWarden_S"],
      ["moonpatcher_", "MoonPatcher_"],   ["arcaneecho_a", "ArcaneEcho_A"],
    ]
    const followTs = historyTimestamps(50, 3, 30)
    for (let i = 0; i < followPool.length; i++) {
      const [login, displayName] = followPool[i]
      await followEventsRepository.insert({
        broadcasterId,
        eventId: `seed-full-history-follow-${i}`,
        userId: `fake-full-history-follow-u${i}`,
        userLogin: login,
        userDisplayName: displayName,
        occurredAt: followTs[i],
      })
    }
    results.historyFollows = 50
  } catch (err) {
    results.historyFollows_error = String(err)
  }

  // ── HISTORY SUBS (30 events: 12 new + 11 resub + 7 gift) ───────────────────
  try {
    const subTs = historyTimestamps(30, 3, 30)
    let cursor = 0

    const newSubs = [
      { name: "GalacticReaper", login: "galacticreaper", tier: "1000" },
      { name: "BlueComet_BG",   login: "bluecomet_bg",   tier: "1000" },
      { name: "CrimsonHaze_C",  login: "crimsonhaze_c",  tier: "2000" },
      { name: "VoidEcho_V",     login: "voidecho_v",     tier: "1000" },
      { name: "NovaTitan_NT",   login: "novatitan_nt",   tier: "3000" },
      { name: "StormSurge_S",   login: "stormsurge_s",   tier: "1000" },
      { name: "SilverFang_SF",  login: "silverfang_sf",  tier: "2000" },
      { name: "DarkMatter_DM",  login: "darkmatter_dm",  tier: "1000" },
      { name: "PulseWave_PW",   login: "pulsewave_pw",   tier: "1000" },
      { name: "IcePhantom_IP",  login: "icephantom_ip",  tier: "3000" },
      { name: "CosmicFlare_CF", login: "cosmicflare_cf", tier: "1000" },
      { name: "ThunderAxe_TA",  login: "thunderaxe_ta",  tier: "2000" },
    ]
    for (const s of newSubs) {
      await subEventsRepository.insert({ broadcasterId, eventId: `seed-full-history-sub-new-${cursor}`, userId: `fake-full-hist-sub-new-u${cursor}`, userLogin: s.login, userDisplayName: s.name, tier: s.tier, kind: "new", giftCount: 1, occurredAt: subTs[cursor++] })
    }

    const resubs = [
      { name: "OldGuard_OG",    login: "oldguard_og",    tier: "1000", months: 24, msg: "2 years strong!" },
      { name: "ReturnedPro",    login: "returnedpro",    tier: "1000", months: 6,  msg: null },
      { name: "LegacySub_LS",   login: "legacysub_ls",   tier: "2000", months: 36, msg: "3 years! Let's go!" },
      { name: "MidnightOwl",    login: "midnightowl",    tier: "1000", months: 3,  msg: "Love the vibes" },
      { name: "SteadySupport",  login: "steadysupport",  tier: "1000", months: 9,  msg: null },
      { name: "CronusWatcher",  login: "cronuswatcher",  tier: "1000", months: 18, msg: "1.5 years!" },
      { name: "GoldenPatron",   login: "goldenpatron",   tier: "3000", months: 12, msg: "1 year, still here!" },
      { name: "PixelVeteran",   login: "pixelveteran",   tier: "1000", months: 2,  msg: null },
      { name: "TimelessFan_T",  login: "timelessfan_t",  tier: "1000", months: 48, msg: "4 years! PogChamp" },
      { name: "ChillSupport",   login: "chillsupport",   tier: "2000", months: 7,  msg: null },
      { name: "WaveRider_WR",   login: "waverider_wr",   tier: "1000", months: 15, msg: "Still here!" },
    ]
    for (const s of resubs) {
      await subEventsRepository.insert({ broadcasterId, eventId: `seed-full-history-sub-resub-${cursor}`, userId: `fake-full-hist-sub-resub-u${cursor}`, userLogin: s.login, userDisplayName: s.name, tier: s.tier, kind: "resub", giftCount: 1, cumulativeMonths: s.months, message: s.msg ?? null, occurredAt: subTs[cursor++] })
    }

    const gifts = [
      { name: "MegaGifter_MG",  login: "megagifter_mg",  count: 20 },
      { name: "GenerousGhost",   login: "generousghost",  count: 5  },
      { name: "SubBomber_SB",   login: "subbomber_sb",   count: 10 },
      { name: "GiftKing_GK",    login: "giftkinggg",     count: 1  },
      { name: "CommunityHero",  login: "communityhero",  count: 5  },
      { name: "SilentGiver_S",  login: "silentgiver_s",  count: 1  },
      { name: "TurboGifts_TG",  login: "turbogifts_tg",  count: 10 },
    ]
    for (const g of gifts) {
      await subEventsRepository.insert({ broadcasterId, eventId: `seed-full-history-sub-gift-${cursor}`, userId: null, userLogin: null, userDisplayName: null, gifterId: `fake-full-hist-sub-gifter-u${cursor}`, gifterLogin: g.login, gifterDisplayName: g.name, tier: "1000", kind: "community_gift", giftCount: g.count, occurredAt: subTs[cursor++] })
    }

    results.historySubs = 30
  } catch (err) {
    results.historySubs_error = String(err)
  }

  // ── HISTORY BITS (20 events) ────────────────────────────────────────────────
  try {
    const bitsPool = [
      { name: "TinyCheer_T",    login: "tinycheer_t",    bits: 69,    msg: "Cheer69",                        anon: false },
      { name: "CasualBits_C",   login: "casualbits_c",   bits: 100,   msg: "Cheer100 good stream!",          anon: false },
      { name: "LuckyNumber_L",  login: "luckynumber_l",  bits: 137,   msg: null,                             anon: false },
      { name: "PixelDrops_P",   login: "pixeldrops_p",   bits: 200,   msg: "Cheer200",                       anon: false },
      { name: "QuarterK_Q",     login: "quarterk_q",     bits: 247,   msg: null,                             anon: false },
      { name: "HalfStack_H",    login: "halfstack_h",    bits: 500,   msg: "Cheer500 keep grinding!",        anon: false },
      { name: "StreamBoost_S",  login: "streamboost_s",  bits: 500,   msg: null,                             anon: false },
      { name: "KiloCheer_KC",   login: "kilocheer_kc",   bits: 1000,  msg: "Cheer1000",                      anon: false },
      { name: "EliteRaid_E",    login: "eliteraid_e",    bits: 1000,  msg: "Cheer1000 love your content!",   anon: false },
      { name: "EliteSupport",   login: "elitesupport",   bits: 1337,  msg: "Cheer1337 leet!",                anon: false },
      { name: "MegaBits_M",     login: "megabits_m",     bits: 2000,  msg: "Cheer2000",                      anon: false },
      { name: "PowerBurst_P",   login: "powerburst_p",   bits: 2500,  msg: null,                             anon: false },
      { name: "HypeCheer_H",    login: "hypecheer_h",    bits: 5000,  msg: "Cheer5000 PogChamp!",            anon: false },
      { name: "SilentBomb_S",   login: "silentbomb_s",   bits: 5000,  msg: null,                             anon: false },
      { name: "Anonymous",      login: "",               bits: 300,   msg: null,                             anon: true  },
      { name: "WarmUp_W",       login: "warmup_w",       bits: 50,    msg: "Cheer50",                        anon: false },
      { name: "FlashCheer_F",   login: "flashcheer_f",   bits: 750,   msg: null,                             anon: false },
      { name: "GigaCheer_G",    login: "gigacheer_g",    bits: 10000, msg: "Cheer10000 OMEGALUL",            anon: false },
      { name: "MidTierFan_M",   login: "midtierfan_m",   bits: 400,   msg: "Cheer400",                       anon: false },
      { name: "FinalCheer_F",   login: "finalcheer_f",   bits: 3000,  msg: "Cheer3000 great run!",           anon: false },
    ]
    const bitsTs = historyTimestamps(20, 3, 28)
    for (let i = 0; i < bitsPool.length; i++) {
      const b = bitsPool[i]
      await cheerEventsRepository.insert({
        broadcasterId,
        eventId: `seed-full-history-bits-${i}`,
        userId: b.anon ? null : `fake-full-hist-bits-u${i}`,
        userLogin: b.anon ? null : b.login,
        userDisplayName: b.anon ? null : b.name,
        bits: b.bits,
        message: b.msg ?? null,
        isAnonymous: b.anon,
        occurredAt: bitsTs[i],
      })
    }
    results.historyBits = 20
  } catch (err) {
    results.historyBits_error = String(err)
  }

  // ── HISTORY RAIDS (7 events) ────────────────────────────────────────────────
  try {
    const raidPool = [
      { login: "neonarcade_tv",  name: "NeonArcade_TV",  viewers: 45   },
      { login: "the_pixel_witch", name: "ThePixelWitch",  viewers: 88   },
      { login: "galactic_forge", name: "GalacticForge",  viewers: 312  },
      { login: "stormwatch_gg",  name: "StormWatch_GG",  viewers: 156  },
      { login: "duskraiders",    name: "DuskRaiders",    viewers: 521  },
      { login: "codevault_tv",   name: "CodeVault_TV",   viewers: 2100 },
      { login: "crystalcove_g",  name: "CrystalCove_G",  viewers: 74   },
    ]
    const raidTs = historyTimestamps(7, 4, 28)
    for (let i = 0; i < raidPool.length; i++) {
      const r = raidPool[i]
      await raidEventsRepository.insert({
        broadcasterId,
        eventId: `seed-full-history-raid-${i}`,
        fromBroadcasterId: `fake-full-hist-raider-${i}`,
        fromBroadcasterLogin: r.login,
        fromBroadcasterDisplayName: r.name,
        viewerCount: r.viewers,
        occurredAt: raidTs[i],
      })
    }
    results.historyRaids = 7
  } catch (err) {
    results.historyRaids_error = String(err)
  }

  // ── HISTORY SUPER CHATS (15 events) ─────────────────────────────────────────
  try {
    // amountMicros: currency units × 1,000,000
    // e.g. $10 USD → 10_000_000 | ¥500 JPY → 500_000_000
    const scPool = [
      { name: "DollarDrop_D",   id: "UCfull-h-dd", amountMicros:     1_000_000, currency: "USD", msg: "First time donating!" },
      { name: "EuroFan_E",      id: "UCfull-h-ef", amountMicros:     2_000_000, currency: "EUR", msg: null                   },
      { name: "PoundBoost_P",   id: "UCfull-h-pb", amountMicros:     5_000_000, currency: "GBP", msg: "Love from the UK!"    },
      { name: "YenStorm_Y",     id: "UCfull-h-ys", amountMicros:   500_000_000, currency: "JPY", msg: null                   },
      { name: "BigBacker_B",    id: "UCfull-h-bb", amountMicros:    50_000_000, currency: "USD", msg: "Keep it up!"          },
      { name: "QuickFire_Q",    id: "UCfull-h-qf", amountMicros:     1_000_000, currency: "USD", msg: null                   },
      { name: "EuroElite_EE",   id: "UCfull-h-ee", amountMicros:    10_000_000, currency: "EUR", msg: "Incredible content!"  },
      { name: "JennyChat_J",    id: "UCfull-h-jc", amountMicros:     5_000_000, currency: "USD", msg: "Hi from Jenny!"       },
      { name: "NightPatron_N",  id: "UCfull-h-np", amountMicros:    20_000_000, currency: "USD", msg: null                   },
      { name: "SterlingFan_S",  id: "UCfull-h-sf", amountMicros:    15_000_000, currency: "GBP", msg: "Brilliant stream!"    },
      { name: "MegaYen_MY",     id: "UCfull-h-my", amountMicros: 1_000_000_000, currency: "JPY", msg: "がんばれ！"           },
      { name: "CasualSC_C",     id: "UCfull-h-cs", amountMicros:     2_000_000, currency: "USD", msg: "Casual drop!"         },
      { name: "TopSupport_T",   id: "UCfull-h-ts", amountMicros:   100_000_000, currency: "USD", msg: "You deserve it!"      },
      { name: "EuroCrowd_EC",   id: "UCfull-h-ec", amountMicros:     3_000_000, currency: "EUR", msg: null                   },
      { name: "FinalSC_F",      id: "UCfull-h-fs", amountMicros:    25_000_000, currency: "GBP", msg: "Legendary stream!"    },
    ]
    const scTs = historyTimestamps(15, 3, 29)
    for (let i = 0; i < scPool.length; i++) {
      const sc = scPool[i]
      await ytSuperChatEventsRepository.insert({
        channelId,
        eventId: `seed-full-history-sc-${i}`,
        userId: sc.id,
        userDisplayName: sc.name,
        amountMicros: sc.amountMicros,
        currency: sc.currency,
        message: sc.msg ?? null,
        occurredAt: scTs[i],
      })
    }
    results.historySuperChats = 15
  } catch (err) {
    results.historySuperChats_error = String(err)
  }

  // ── HISTORY MEMBERS (10 events) ──────────────────────────────────────────────
  try {
    const memberPool = [
      { name: "NewJoiner_NJ",   id: "UCfull-h-m0", months: 1,  level: null          },
      { name: "MonthlySup_M",   id: "UCfull-h-m1", months: 2,  level: "Member"      },
      { name: "QuarterYr_Q",    id: "UCfull-h-m2", months: 3,  level: "Member"      },
      { name: "HalfYrFan_H",    id: "UCfull-h-m3", months: 6,  level: "Fan"         },
      { name: "AnnualSup_A",    id: "UCfull-h-m4", months: 12, level: "Super Fan"   },
      { name: "LoyalElite_L",   id: "UCfull-h-m5", months: 18, level: "Super Fan"   },
      { name: "TwoYearOG_T",    id: "UCfull-h-m6", months: 24, level: "OG Member"   },
      { name: "TriMember_T",    id: "UCfull-h-m7", months: 36, level: "OG Member"   },
      { name: "MidTierMbr_M",   id: "UCfull-h-m8", months: 4,  level: "Fan"         },
      { name: "RecurringR_R",   id: "UCfull-h-m9", months: 9,  level: "Member"      },
    ]
    const memberTs = historyTimestamps(10, 4, 28)
    for (let i = 0; i < memberPool.length; i++) {
      const m = memberPool[i]
      await ytMemberEventsRepository.insert({
        channelId,
        eventId: `seed-full-history-member-${i}`,
        userId: m.id,
        userDisplayName: m.name,
        memberMonths: m.months,
        levelName: m.level ?? null,
        occurredAt: memberTs[i],
      })
    }
    results.historyMembers = 10
  } catch (err) {
    results.historyMembers_error = String(err)
  }

  // ── STREAM SESSIONS ─────────────────────────────────────────────────────────
  // 5 past sessions spread across the last 28 days, each 2–4 hours long.
  // Fixed UUIDs so re-running the seed is idempotent.
  try {
    const SESSIONS = [
      { id: "a0000001-0000-4000-8000-000000000001", startDays: 28, startHour: 19, durationMins: 180 },
      { id: "a0000002-0000-4000-8000-000000000002", startDays: 21, startHour: 20, durationMins: 240 },
      { id: "a0000003-0000-4000-8000-000000000003", startDays: 14, startHour: 18, durationMins: 150 },
      { id: "a0000004-0000-4000-8000-000000000004", startDays: 7,  startHour: 21, durationMins: 210 },
      { id: "a0000005-0000-4000-8000-000000000005", startDays: 2,  startHour: 19, durationMins: 195 },
    ]
    for (const s of SESSIONS) {
      const startedAt = ago(s.startDays, -s.startHour)
      const endedAt = new Date(startedAt.getTime() + s.durationMins * 60 * 1000)
      await db.insert(streamSessions)
        .values({ id: s.id, broadcasterId, startedAt, endedAt })
        .onConflictDoNothing()
    }
    results.streamSessions = SESSIONS.length
  } catch (err) {
    results.streamSessions_error = String(err)
  }

  const total = [
    results.recentEvents,
    results.historyFollows,
    results.historySubs,
    results.historyBits,
    results.historyRaids,
    results.historySuperChats,
    results.historyMembers,
  ].reduce<number>((sum, v) => sum + (typeof v === "number" ? v : 0), 0)

  return NextResponse.json({ ok: true, total, seeded: results })
}