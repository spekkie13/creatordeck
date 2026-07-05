import { NextRequest, NextResponse } from "next/server"
import { CustomerPortal } from "@polar-sh/nextjs"

import { env } from "@/lib/env"
import { requireSession } from "@/lib/session-auth"

// GET /api/portal — redirects to Polar's self-serve customer portal (manage /
// cancel). The customer is resolved by our user.id via externalCustomerId, set
// at checkout, so no stored Polar customer id lookup is needed here.
export const GET = CustomerPortal({
  accessToken: env.polarAccessToken,
  server: env.polarServer,
  getExternalCustomerId: async (req: NextRequest): Promise<string> => {
    const result = await requireSession()
    if (result instanceof NextResponse) throw new Error("Unauthorized")
    return result.session.userId
  },
})
