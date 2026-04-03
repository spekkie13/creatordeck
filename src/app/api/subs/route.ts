import { NextRequest, NextResponse } from 'next/server'

import { apiError } from '@/lib/api-response'
import { SubsQuerySchema } from '@/lib/schemas/subs.schema'

import { userRepository } from '@/repositories'
import { subsService } from '@/services'

export async function GET(req: NextRequest) {
  const apiKey = req.headers.get('x-api-key') ?? req.nextUrl.searchParams.get('key') ?? ''
  if (!apiKey) return NextResponse.json({ error: 'Missing API key' }, { status: 401 })

  const user = await userRepository.findByApiKey(apiKey)
  if (!user) return NextResponse.json({ error: 'Invalid API key' }, { status: 401 })

  const query = SubsQuerySchema.safeParse({ since: req.nextUrl.searchParams.get('since') ?? undefined })
  if (!query.success) return apiError(400, query.error.issues[0].message)

  const events = await subsService.getSubEvents(user.id, query.data.since ? new Date(query.data.since) : undefined)
  return NextResponse.json({ events })
}
