import { NextResponse } from "next/server"
import { getServerSession, Session } from "next-auth"

import { authOptions } from "@/lib/auth"
import {SessionResult, SessionWithTwitchId, TwitchSessionResult} from "@/types/session";

export async function requireSession(): Promise<SessionResult> {
  const session: Session | null = await getServerSession(authOptions)
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  return { session }
}

export async function requireTwitchSession(): Promise<TwitchSessionResult> {
  const session: Session | null = await getServerSession(authOptions)
  if (!session?.twitchId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  return { session: session as SessionWithTwitchId }
}

export function devOnly(): NextResponse | null {
  if (process.env.NODE_ENV === "production")
    return NextResponse.json({ error: "Not available in production" }, { status: 404 })
  return null
}
