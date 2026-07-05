import { Polar } from "@polar-sh/sdk"

import { env } from "@/lib/env"

// Lazily-constructed Polar API client for server-side calls that aren't covered
// by the @polar-sh/nextjs route adapters (e.g. cancelling a subscription on
// account deletion). Checkout/portal/webhook use the adapters instead.
let client: Polar | null = null

export function polar(): Polar {
  if (!client) {
    client = new Polar({ accessToken: env.polarAccessToken, server: env.polarServer })
  }
  return client
}
