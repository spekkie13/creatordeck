import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { linkedAccountsRepository } from "@/repositories"
import { spotifyFetch } from "@/lib/spotify"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.userId) return new Response("Unauthorized", { status: 401 })

  const accounts = await linkedAccountsRepository.findByUserId(session.userId)
  const spotifyAccount = accounts.find(a => a.provider === "spotify")
  if (!spotifyAccount?.accessToken) return Response.json([])

  try {
    const res = await spotifyFetch(
      {
        providerAccountId: spotifyAccount.providerAccountId,
        accessToken: spotifyAccount.accessToken,
        refreshToken: spotifyAccount.refreshToken ?? null,
      },
      "https://api.spotify.com/v1/me/player/queue",
    )

    if (!res.ok) return Response.json([])

    const data = await res.json()
    const queue = (data.queue as Record<string, unknown>[] | undefined) ?? []

    return Response.json(
      queue.slice(0, 10).map(item => ({
        track: item.name as string,
        artist: (item.artists as { name: string }[]).map(a => a.name).join(", "),
        albumArt: (item.album as { images: { url: string }[] }).images?.[0]?.url ?? null,
      }))
    )
  } catch {
    return Response.json([])
  }
}
