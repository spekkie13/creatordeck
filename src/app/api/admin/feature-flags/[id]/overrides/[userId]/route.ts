import { NextRequest } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { apiError, apiSuccess } from "@/lib/api-response"
import { featureFlagsRepository } from "@/repositories"

type Params = { params: Promise<{ id: string; userId: string }> }

export async function PUT(req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session?.isAdmin) return apiError(403, "Forbidden")

  const { id, userId } = await params
  const flag = await featureFlagsRepository.getById(id)
  if (!flag) return apiError(404, "Not found")

  const body = await req.json() as { enabled?: boolean }
  if (typeof body.enabled !== "boolean") return apiError(400, "enabled is required")

  const override = await featureFlagsRepository.setOverride(id, userId, body.enabled)

  await featureFlagsRepository.appendAuditLog({
    flagName: flag.name,
    actorId: session.userId,
    changeType: "override_set",
    previousValue: null,
    newValue: body.enabled,
    targetUserId: userId,
  })

  return apiSuccess(override)
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session?.isAdmin) return apiError(403, "Forbidden")

  const { id, userId } = await params
  const flag = await featureFlagsRepository.getById(id)
  if (!flag) return apiError(404, "Not found")

  await featureFlagsRepository.removeOverride(id, userId)

  await featureFlagsRepository.appendAuditLog({
    flagName: flag.name,
    actorId: session.userId,
    changeType: "override_removed",
    previousValue: null,
    newValue: null,
    targetUserId: userId,
  })

  return new Response(null, { status: 204 })
}
