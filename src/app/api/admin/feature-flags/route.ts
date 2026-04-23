import { NextRequest } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { apiError, apiSuccess } from "@/lib/api-response"
import { featureFlagsRepository } from "@/repositories"

const FLAG_NAME_RE = /^[a-z0-9-]+$/

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.isAdmin) return apiError(403, "Forbidden")

  const flags = await featureFlagsRepository.getAll()
  return apiSuccess(flags)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.isAdmin) return apiError(403, "Forbidden")

  const body = await req.json() as { name?: string; description?: string; enabled?: boolean }
  if (!body.name || !FLAG_NAME_RE.test(body.name)) {
    return apiError(400, "name must be lowercase alphanumeric with hyphens only")
  }

  const existing = await featureFlagsRepository.getByName(body.name)
  if (existing) return apiError(409, "Flag already exists")

  const flag = await featureFlagsRepository.create({
    name: body.name,
    description: body.description ?? null,
    enabled: body.enabled ?? false,
  })

  await featureFlagsRepository.appendAuditLog({
    flagName: flag.name,
    actorId: session.userId,
    changeType: "created",
    previousValue: null,
    newValue: flag.enabled,
    targetUserId: null,
  })

  return apiSuccess(flag, 201)
}
