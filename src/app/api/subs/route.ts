import { NextRequest, NextResponse } from 'next/server'

import { validateApiKey } from '@/lib/api-auth'
import { apiError } from '@/lib/api-response'
import { SubsQuerySchema } from '@/lib/schemas/subs.schema'

import { subsService } from '@/services'
import {ApiAuthResult} from "@/types/session";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const result: ApiAuthResult = await validateApiKey(req)
  if (result instanceof NextResponse) return result
  const { user } = result

  const query = SubsQuerySchema.safeParse({ since: req.nextUrl.searchParams.get('since') ?? undefined })
  if (!query.success) return apiError(400, query.error.issues[0].message)

  const events = await subsService.getSubEvents(user.id, query.data.since ? new Date(query.data.since) : undefined)
  return NextResponse.json({ events })
}
