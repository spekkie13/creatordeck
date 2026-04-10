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
    return NextResponse.json([])

  try {
    const res: Response = await spotifyService.spotifyFetch(
      {
        providerAccountId: spotifyAccount.providerAccountId,
        accessToken: spotifyAccount.accessToken,
        refreshToken: spotifyAccount.refreshToken ?? null,
      },
      "https://api.spotify.com/v1/me/player/queue",
    )

    if (!res.ok) return NextResponse.json([])

    const data = await res.json()
    const queue: Record<string, unknown>[] = (data.queue as Record<string, unknown>[] | undefined) ?? []

    return NextResponse.json(
      queue.slice(0, 10).map((item: Record<string, unknown>) => ({
        track: item.name as string,
        artist: (item.artists as { name: string }[]).map(a => a.name).join(", "),
        albumArt: (item.album as { images: { url: string }[] }).images?.[0]?.url ?? null,
      }))
    )
  } catch {
    return NextResponse.json([])
  }
}