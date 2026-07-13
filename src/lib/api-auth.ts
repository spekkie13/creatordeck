import { NextRequest, NextResponse } from "next/server"

import type { User } from "@/types/entities"

import { userRepository } from "@/repositories"
import { requirePro } from "@/lib/require-pro"
import {ApiAuthResult} from "@/types/session";

export async function validateApiKey(req: NextRequest): Promise<ApiAuthResult> {
  const apiKey: string = req.headers.get("x-api-key") ?? req.nextUrl.searchParams.get("key") ?? ""
  if (!apiKey)
    return NextResponse.json({ error: "Missing API key" }, { status: 401 })

  const user: User | null = await userRepository.findByApiKey(apiKey)
  if (!user)
    return NextResponse.json({ error: "Invalid API key" }, { status: 401 })

  return { user }
}

/**
 * Pro-gated API-key auth (spec §3.5 rows 2–4, 6). The mandatory guard for every
 * future write/act desktop-app route — OBS scene/source/volume writes, macro
 * dispatch, profile create/switch. Read-only routes keep `validateApiKey`.
 * Exported-but-unused until those features ship — do not remove as dead code.
 */
export async function requireProForApiKey(req: NextRequest): Promise<ApiAuthResult> {
  const result = await validateApiKey(req)
  if (result instanceof NextResponse) return result

  const gate = await requirePro(result.user.id)
  if (gate) return gate

  return result
}
