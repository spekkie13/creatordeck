import { NextRequest, NextResponse } from "next/server"

import type { User } from "@/types/entities"

import { userRepository } from "@/repositories"
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
