import { NextRequest, NextResponse } from "next/server"
import { waitlistRepository } from "@/repositories"

export async function POST(req: NextRequest) {
  const { email, twitchLogin, interestedTier } = await req.json()

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Valid email required" }, { status: 400 })
  }

  try {
    await waitlistRepository.insert(email.toLowerCase().trim(), twitchLogin?.trim(), interestedTier)
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }
}
