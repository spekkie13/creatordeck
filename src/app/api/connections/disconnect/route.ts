import { getServerSession } from "next-auth"

import { authOptions } from "@/lib/auth"

import { linkedAccountsRepository } from "@/repositories"

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.userId) return new Response("Unauthorized", { status: 401 })

  const { provider } = await req.json() as { provider: string }
  if (!provider || !["youtube", "twitch", "spotify"].includes(provider)) {
    return new Response("Invalid provider", { status: 400 })
  }

  // Prevent disconnecting the only linked account — user would be locked out
  const allAccounts = await linkedAccountsRepository.findByUserId(session.userId)
  if (allAccounts.length <= 1) {
    return new Response("Cannot disconnect your only linked account", { status: 400 })
  }

  await linkedAccountsRepository.deleteByUserIdAndProvider(session.userId, provider)
  return new Response(null, { status: 204 })
}