import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

import { env } from '@/lib/env'
import {
  AccountConflictException,
  StreamElementsTokenExchangeFailedException,
} from '@/lib/exceptions'

import { connectionsService } from '@/services'
import { northflankService } from '@/services/northflank.service'

const BASE_URL = (process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXTAUTH_URL)!.replace(/\/$/, '')

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')

  if (!code || !state) {
    return NextResponse.redirect(`${BASE_URL}/connections?error=missing_params`)
  }

  const cookieStore = await cookies()
  const linkStateCookie = cookieStore.get('se_link_state')
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
    console.error('[streamelements/callback] Failed to parse state cookie:', err)
    return NextResponse.redirect(`${BASE_URL}/connections?error=invalid_state`)
  }

  const tokenRes = await fetch('https://api.streamelements.com/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: env.seClientId,
      client_secret: env.seClientSecret,
      redirect_uri: `${BASE_URL}/api/connections/link/streamelements/callback`,
      grant_type: 'authorization_code',
    }),
  })

  const tokenData = await tokenRes.json()
  if (!tokenData.access_token) {
    console.error('[streamelements/callback] Token exchange failed:', tokenData)
    return NextResponse.redirect(`${BASE_URL}/connections?error=token_exchange_failed`)
  }

  let channelId: string
  try {
    const result = await connectionsService.linkStreamElementsAccount(
      userId,
      tokenData.access_token,
      tokenData.refresh_token ?? '',
    )
    channelId = result.channelId
  } catch (err) {
    if (err instanceof StreamElementsTokenExchangeFailedException) {
      return NextResponse.redirect(`${BASE_URL}/connections?error=token_exchange_failed`)
    }
    if (err instanceof AccountConflictException) {
      return NextResponse.redirect(`${BASE_URL}/connections?error=account_conflict`)
    }
    console.error('[streamelements/callback] Unexpected error linking account for userId', userId, err)
    return NextResponse.redirect(`${BASE_URL}/connections?error=unknown`)
  }

  try {
    await northflankService.registerChannel(channelId, tokenData.access_token, tokenData.refresh_token ?? '')
  } catch (err) {
    console.error('[streamelements/callback] NorthFlank registration failed for channel', channelId, err)
    // Do not block the user — account is linked in DB, bridge will pick it up on next restart
  }

  const response = NextResponse.redirect(`${BASE_URL}/connections?linked=streamelements`)
  response.cookies.delete('se_link_state')
  return response
}
