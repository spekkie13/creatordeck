import { NextRequest, NextResponse } from "next/server"

import { validateWidgetToken } from "@/lib/widget-auth"
import { linkedAccountsRepository } from "@/repositories"
import { spotifyService } from "@/services/spotify-service"
import { PLATFORM_SPOTIFY } from "@/types/platform"
import { WidgetAuthResult } from "@/types/session"

export async function GET(req: NextRequest): Promise<NextResponse> {
  const result: WidgetAuthResult = await validateWidgetToken(req)
  if (result instanceof NextResponse) return result
  const { user } = result

  const spotifyAccount = await linkedAccountsRepository.findByUserIdAndProvider(user.id, PLATFORM_SPOTIFY)
  if (!spotifyAccount?.accessToken)
    return NextResponse.json(null)

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