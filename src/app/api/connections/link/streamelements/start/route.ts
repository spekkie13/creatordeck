import { NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { getServerSession } from 'next-auth'

import { env } from '@/lib/env'
import { authOptions } from '@/lib/auth'

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXTAUTH_URL)!.replace(/\/$/, '')

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.userId) return NextResponse.redirect(new URL('/', APP_URL))

  const state = randomBytes(16).toString('base64url')

  const params = new URLSearchParams({
    client_id: env.seClientId,
    redirect_uri: `${APP_URL}/api/connections/link/streamelements/callback`,
    response_type: 'code',
    scope: 'channel:read',
    state,
  })

  const response = NextResponse.redirect(
    `https://api.streamelements.com/oauth2/authorize?${params}`,
  )

  response.cookies.set(
    'se_link_state',
    JSON.stringify({ state, userId: session.userId }),
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600,
      path: '/',
    },
  )

  return response
}
