import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { linkedAccountsRepository } from "@/repositories"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.userId) return new Response("Unauthorized", { status: 401 })

  const accounts = await linkedAccountsRepository.findByUserId(session.userId)
  const twitchAccount = accounts.find(a => a.provider === "twitch")
  if (!twitchAccount?.accessToken) return new Response("No Twitch account", { status: 404 })

  return Response.json({
    token: twitchAccount.accessToken,
    login: twitchAccount.login ?? twitchAccount.displayName ?? "",
  })
}