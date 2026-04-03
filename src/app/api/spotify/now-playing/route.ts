import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"

import { authOptions } from "@/lib/auth"
import { apiError } from "@/lib/api-response"
import { spotifyFetch } from "@/lib/spotify"

import { linkedAccountsRepository } from "@/repositories"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.userId) return apiError(401, 'Unauthorized')

  const accounts = await linkedAccountsRepository.findByUserId(session.userId)
  const spotifyAccount = accounts.find(a => a.provider === "spotify")
  if (!spotifyAccount?.accessToken) return NextResponse.json(null)

  try {
    const res = await spotifyFetch(
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
