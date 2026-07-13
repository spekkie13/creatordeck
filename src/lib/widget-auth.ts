import { NextRequest, NextResponse } from "next/server"

import type { User } from "@/types/entities"

import { userRepository } from "@/repositories"
import { requirePro } from "@/lib/require-pro"
import {WidgetAuthResult} from "@/types/session";

export async function validateWidgetToken(req: NextRequest): Promise<WidgetAuthResult> {
  const token: string | null = new URL(req.url).searchParams.get("token")
  if (!token)
    return NextResponse.json({ error: "Missing token" }, { status: 400 })

  const user: User | null = await userRepository.findByWidgetToken(token)
  if (!user)
    return NextResponse.json({ error: "Invalid token" }, { status: 401 })

  return { user }
}

/**
 * Pro-gated widget-token auth (spec §3.5). For future Pro-only widget surfaces;
 * the existing goal overlays stay Free via `validateWidgetToken`.
 * Exported-but-unused until such a surface ships — do not remove as dead code.
 */
export async function requireProForWidgetToken(req: NextRequest): Promise<WidgetAuthResult> {
  const result = await validateWidgetToken(req)
  if (result instanceof NextResponse) return result

  const gate = await requirePro(result.user.id)
  if (gate) return gate

  return result
}
