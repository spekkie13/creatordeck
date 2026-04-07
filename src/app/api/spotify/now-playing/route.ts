import { NextResponse } from "next/server"

import { requireSession } from "@/lib/session-auth"

import { linkedAccountsRepository } from "@/repositories"
import {spotifyService} from "@/services/spotify-service";
import {PLATFORM_SPOTIFY} from "@/types/platform";

export async function GET() {
  const result = await requireSession()
  if (result instanceof NextResponse) return result
  const { session } = result

  const spotifyAccount = await linkedAccountsRepository.findByUserIdAndProvider(session.userId, PLATFORM_SPOTIFY)
  if (!spotifyAccount?.accessToken)
    return Response.json(null)

  try {
    const res: Response = await spotifyService.spotifyFetch(
      {
        providerAccountId: spotifyAccount.providerAccountId,
        accessToken: spotifyAccount.accessToken,
        refreshToken: spotifyAccount.refreshToken ?? null,
      },
      "https://api.spotify.com/v1/me/player/currently-playing",
    )

    if (res.status === 204 || res.status === 401) return NextResponse.json(null)
    if (!res.ok) return NextResponse.json(null)

    const data = await res.json()
    if (!data?.item) return NextResponse.json(null)

    return NextResponse.json({
      isPlaying: data.is_playing as boolean,
      track: data.item.name as string,
      artist: (data.item.artists as { name: string }[]).map(a => a.name).join(", "),
      albumArt: (data.item.album.images as { url: string }[])?.[0]?.url ?? null,
      progress: data.progress_ms as number,
      duration: data.item.duration_ms as number,
    })
  } catch {
    return NextResponse.json(null)
  }
}
