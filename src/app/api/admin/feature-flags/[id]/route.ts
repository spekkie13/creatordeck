import { NextRequest } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { apiError, apiSuccess } from "@/lib/api-response"
import { featureFlagsRepository } from "@/repositories"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.isAdmin) return apiError(403, "Forbidden")

  const { id } = await params
  const flag = await featureFlagsRepository.getById(id)
  if (!flag) return apiError(404, "Not found")

  const body = await req.json() as { enabled?: boolean }
  if (typeof body.enabled !== "boolean") return apiError(400, "enabled is required")

  const updated = await featureFlagsRepository.update(id, body.enabled)

  await featureFlagsRepository.appendAuditLog({
    flagName: flag.name,
    actorId: session.userId,
    changeType: "updated",
    previousValue: flag.enabled,
    newValue: body.enabled,
    targetUserId: null,
  })

  return apiSuccess(updated)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.isAdmin) return apiError(403, "Forbidden")

  const { id } = await params
  const flag = await featureFlagsRepository.getById(id)
  if (!flag) return apiError(404, "Not found")

  await featureFlagsRepository.delete(id)

  await featureFlagsRepository.appendAuditLog({
    flagName: flag.name,
    actorId: session.userId,
    changeType: "deleted",
    previousValue: flag.enabled,
    newValue: null,
    targetUserId: null,
  })

  return new Response(null, { status: 204 })
}
