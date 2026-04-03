import { getServerSession } from "next-auth"

import { authOptions } from "@/lib/auth"
import { apiError } from "@/lib/api-response"

import { linkedAccountsRepository } from "@/repositories"

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.userId) return apiError(401, 'Unauthorized')

  const { provider } = await req.json() as { provider: string }
  if (!provider || !["youtube", "twitch", "spotify"].includes(provider)) {
    return apiError(400, 'Invalid provider')
  }

  // Prevent disconnecting the only linked account — user would be locked out
  const allAccounts = await linkedAccountsRepository.findByUserId(session.userId)
  if (allAccounts.length <= 1) {
    return apiError(400, 'Cannot disconnect your only linked account')
  }

  await linkedAccountsRepository.deleteByUserIdAndProvider(session.userId, provider)
  return new Response(null, { status: 204 })
}