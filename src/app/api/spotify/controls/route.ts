import { NextResponse } from "next/server"

import { requireSession } from "@/lib/session-auth"
import { apiError } from "@/lib/api-response"
import { SpotifyControlsSchema } from "@/lib/schemas/spotify.schema"

import { linkedAccountsRepository } from "@/repositories"
import { PLATFORM_SPOTIFY } from "@/types/platform"
import {spotifyService} from "@/services/spotify-service";

const MIN_VOLUME = 0
const MAX_VOLUME = 100

const ACTION_MAP: Record<string, { method: string; url: string }> = {
  play:     { method: "PUT",  url: "https://api.spotify.com/v1/me/player/play" },
  pause:    { method: "PUT",  url: "https://api.spotify.com/v1/me/player/pause" },
  skip:     { method: "POST", url: "https://api.spotify.com/v1/me/player/next" },
  previous: { method: "POST", url: "https://api.spotify.com/v1/me/player/previous" },
}

export async function POST(req: Request) {
  const result = await requireSession()
  if (result instanceof NextResponse) return result
  const { session } = result

  const parsed = SpotifyControlsSchema.safeParse(await req.json())
  if (!parsed.success) return apiError(400, parsed.error.issues[0].message)

  const { action, volume } = parsed.data

  const spotifyAccount = await linkedAccountsRepository.findByUserIdAndProvider(session.userId, PLATFORM_SPOTIFY)
  if (!spotifyAccount?.accessToken) return apiError(400, 'Spotify not connected')

  const account = {
    providerAccountId: spotifyAccount.providerAccountId,
    accessToken: spotifyAccount.accessToken,
    refreshToken: spotifyAccount.refreshToken ?? null,
  }

  try {
    let res: Response
    if (action === "volume") {
      const pct = Math.max(MIN_VOLUME, Math.min(MAX_VOLUME, Math.round(volume ?? 50)))
      res = await spotifyService.spotifyFetch(account, `https://api.spotify.com/v1/me/player/volume?volume_percent=${pct}`, { method: "PUT" })
    } else if (action in ACTION_MAP) {
      const { method, url } = ACTION_MAP[action]
      res = await spotifyService.spotifyFetch(account, url, { method })
    } else {
      return apiError(400, 'Invalid action')
    }

    // Spotify returns 204 on success, 403 if not Premium, 404 if no active device
    if (res.status === 204) return new Response(null, { status: 204 })
    if (res.status === 403) return apiError(403, 'Spotify Premium required')
    if (res.status === 404) return apiError(404, 'No active Spotify device')
    return apiError(res.status, 'Spotify error')
  } catch (err) {
    console.error('[spotify/controls] Unexpected error:', err)
    return apiError(500, 'Internal error')
  }
}
