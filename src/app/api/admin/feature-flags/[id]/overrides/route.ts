import { NextRequest } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { apiError, apiSuccess } from "@/lib/api-response"
import { featureFlagsRepository } from "@/repositories"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.isAdmin) return apiError(403, "Forbidden")

  const { id } = await params
  const flag = await featureFlagsRepository.getById(id)
  if (!flag) return apiError(404, "Not found")

  const overrides = await featureFlagsRepository.getOverrides(id)
  return apiSuccess(overrides)
}
