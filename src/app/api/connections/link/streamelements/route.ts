import { NextResponse } from 'next/server'

import { requireSession } from '@/lib/session-auth'
import { apiError } from '@/lib/api-response'
import { AccountConflictException, StreamElementsTokenExchangeFailedException } from '@/lib/exceptions'

import { connectionsService } from '@/services'

export async function POST(req: Request) {
  const result = await requireSession()
  if (result instanceof NextResponse) return result
  const { session } = result

  const { jwtToken } = await req.json() as { jwtToken?: string }
  if (!jwtToken?.trim()) return apiError(400, 'jwtToken is required')

  try {
    await connectionsService.linkStreamElementsAccount(session.userId, jwtToken.trim())
  } catch (err) {
    if (err instanceof StreamElementsTokenExchangeFailedException) {
      return apiError(400, 'Invalid JWT token — could not verify StreamElements account')
    }
    if (err instanceof AccountConflictException) {
      return apiError(409, 'This StreamElements account is already linked to another user')
    }
    console.error('[link/streamelements] Unexpected error for userId', session.userId, err)
    return apiError(500, 'Unexpected error linking account')
  }

  return NextResponse.json({ ok: true })
}