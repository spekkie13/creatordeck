import { NextResponse } from "next/server"

import { requireSession } from "@/lib/session-auth"

import { linkedAccountsRepository } from "@/repositories"
import {spotifyService} from "@/services/spotify-service";
import { PLATFORM_SPOTIFY } from "@/types/platform"

export async function GET() {
  const result = await requireSession()
  if (result instanceof NextResponse) return result
  const { session } = result

  const spotifyAccount = await linkedAccountsRepository.findByUserIdAndProvider(session.userId, PLATFORM_SPOTIFY)
  if (!spotifyAccount?.accessToken)
      return Response.json([])

  try {
    const res: Response = await spotifyService.spotifyFetch(
      {
        providerAccountId: spotifyAccount.providerAccountId,
        accessToken: spotifyAccount.accessToken,
        refreshToken: spotifyAccount.refreshToken ?? null,
      },
      "https://api.spotify.com/v1/me/player/queue",
    )

    if (!res.ok) return Response.json([])

    const data = await res.json()
    const queue: Record<string, unknown>[] = (data.queue as Record<string, unknown>[] | undefined) ?? []

    return Response.json(
      queue.slice(0, 10).map((item: Record<string, unknown>) => ({
        track: item.name as string,
        artist: (item.artists as { name: string }[]).map(a => a.name).join(", "),
        albumArt: (item.album as { images: { url: string }[] }).images?.[0]?.url ?? null,
      }))
    )
  } catch {
    return Response.json([])
  }
}
