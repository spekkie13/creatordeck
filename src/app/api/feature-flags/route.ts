import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { apiError, apiSuccess } from "@/lib/api-response"
import { featureFlagsRepository } from "@/repositories"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.userId) return apiError(401, "Unauthorized")

  const flags = await featureFlagsRepository.getResolved(session.userId)
  return apiSuccess(flags)
}