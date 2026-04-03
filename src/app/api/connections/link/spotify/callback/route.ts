import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

import {
  AccountConflictException,
  SpotifyProfileFetchFailedException,
  TokenExchangeFailedException,
} from '@/lib/exceptions'

import { connectionsService } from '@/services'

const BASE_URL = (process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXTAUTH_URL)!.replace(/\/$/, '')

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')

  if (!code || !state) {
    return NextResponse.redirect(`${BASE_URL}/connections?error=missing_params`)
  }

  const cookieStore = await cookies()
  const linkStateCookie = cookieStore.get('spotify_link_state')
  if (!linkStateCookie) {
    return NextResponse.redirect(`${BASE_URL}/connections?error=invalid_state`)
  }

  let userId: string
  try {
    const parsed = JSON.parse(linkStateCookie.value)
    if (parsed.state !== state) {
      return NextResponse.redirect(`${BASE_URL}/connections?error=invalid_state`)
    }
    userId = parsed.userId
  } catch (err) {
    console.error('[spotify/callback] Failed to parse state cookie:', err)
    return NextResponse.redirect(`${BASE_URL}/connections?error=invalid_state`)
  }

  const redirectUri = `${BASE_URL}/api/connections/link/spotify/callback`

  try {
    await connectionsService.linkSpotifyAccount(userId, code, redirectUri)
  } catch (err) {
    if (err instanceof TokenExchangeFailedException) return NextResponse.redirect(`${BASE_URL}/connections?error=token_exchange_failed`)
    if (err instanceof SpotifyProfileFetchFailedException) return NextResponse.redirect(`${BASE_URL}/connections?error=token_exchange_failed`)
    if (err instanceof AccountConflictException) return NextResponse.redirect(`${BASE_URL}/connections?error=account_conflict`)
    console.error('[spotify/callback] Unexpected error linking account for userId', userId, err)
    return NextResponse.redirect(`${BASE_URL}/connections?error=unknown`)
  }

  const response = NextResponse.redirect(`${BASE_URL}/connections?linked=spotify`)
  response.cookies.delete('spotify_link_state')
  return response
}
