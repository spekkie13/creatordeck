import { NextResponse } from "next/server"

import { requireSession } from "@/lib/session-auth"

import { linkedAccountsRepository } from "@/repositories"
import { PLATFORM_SPOTIFY } from "@/types/platform"
import {spotifyService} from "@/services/spotify-service";

type Action = "play" | "pause" | "skip" | "previous" | "volume"

const ACTION_MAP: Record<Exclude<Action, "volume">, { method: string; url: string }> = {
  play:     { method: "PUT",  url: "https://api.spotify.com/v1/me/player/play" },
  pause:    { method: "PUT",  url: "https://api.spotify.com/v1/me/player/pause" },
  skip:     { method: "POST", url: "https://api.spotify.com/v1/me/player/next" },
  previous: { method: "POST", url: "https://api.spotify.com/v1/me/player/previous" },
}

export async function POST(req: Request) {
  const result = await requireSession()
  if (result instanceof NextResponse) return result
  const { session } = result

  const body = await req.json() as { action: Action; volume?: number }
  const { action, volume } = body

  const spotifyAccount = await linkedAccountsRepository.findByUserIdAndProvider(session.userId, PLATFORM_SPOTIFY)
  if (!spotifyAccount?.accessToken) return new Response("Spotify not connected", { status: 400 })

  const account = {
    providerAccountId: spotifyAccount.providerAccountId,
    accessToken: spotifyAccount.accessToken,
    refreshToken: spotifyAccount.refreshToken ?? null,
  }

  try {
    let res: Response
    if (action === "volume") {
      const pct = Math.max(0, Math.min(100, Math.round(volume ?? 50)))
      res = await spotifyService.spotifyFetch(account, `https://api.spotify.com/v1/me/player/volume?volume_percent=${pct}`, { method: "PUT" })
    } else if (action in ACTION_MAP) {
      const { method, url } = ACTION_MAP[action]
      res = await spotifyService.spotifyFetch(account, url, { method })
    } else {
      return new Response("Invalid action", { status: 400 })
    }

    // Spotify returns 204 on success, 403 if not Premium, 404 if no active device
    if (res.status === 204) return new Response(null, { status: 204 })
    if (res.status === 403) return new Response("Spotify Premium required", { status: 403 })
    if (res.status === 404) return new Response("No active Spotify device", { status: 404 })
    return new Response(null, { status: res.status })
  } catch {
    return new Response("Internal error", { status: 500 })
  }
}
