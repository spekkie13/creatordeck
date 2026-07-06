import { NextResponse } from "next/server"

import { env } from "@/lib/env"
import {
  ytSuperChatEventsRepository,
  ytMemberEventsRepository,
  ytStreamSessionsRepository,
} from "@/repositories"

export const runtime = "nodejs"

// YouTube API Services data retention limit stated in the Privacy Policy. Data
// retrieved from YouTube is deleted once it is older than this window.
const RETENTION_DAYS = 30

/**
 * Scheduled retention purge (Vercel Cron, daily). Deletes stored YouTube-derived
 * data older than RETENTION_DAYS, honouring the Privacy Policy's 30-day cap:
 * Super Chat events (the 30-day retention), membership events (dormant legacy
 * rows from the removed scraper), and any broadcast session orphaned by a crash
 * that never reached close() — sessions are normally deleted the moment a stream
 * ends. Chat messages are no longer stored, so there is nothing to purge there.
 *
 * Vercel Cron invokes this with `Authorization: Bearer <CRON_SECRET>` when the
 * CRON_SECRET env var is set; the same header check lets you trigger it manually.
 */
export async function GET(req: Request) {
  const auth = req.headers.get("authorization")
  if (auth !== `Bearer ${env.cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000)

  const [superChats, members, sessions] = await Promise.all([
    ytSuperChatEventsRepository.deleteOlderThan(cutoff),
    ytMemberEventsRepository.deleteOlderThan(cutoff),
    ytStreamSessionsRepository.deleteOlderThan(cutoff),
  ])

  const deleted = { superChats, members, sessions }
  console.log("[cron/purge-youtube] purged", { cutoff: cutoff.toISOString(), ...deleted })

  return NextResponse.json({ ok: true, cutoff: cutoff.toISOString(), deleted })
}
