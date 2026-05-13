import { lemonSqueezySetup } from "@lemonsqueezy/lemonsqueezy.js"
import { env } from "@/lib/env"

export function configureLemonSqueezy() {
    lemonSqueezySetup({
        apiKey: env.lemonSqueezyApiKey,
        onError: (error) => console.error("Lemon Squeezy error:", error),
    })
}
