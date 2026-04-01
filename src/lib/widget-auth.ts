import { NextRequest, NextResponse } from "next/server"

import type { User } from "@/types/entities"

import { userRepository } from "@/repositories"
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
