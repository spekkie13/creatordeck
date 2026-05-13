import { NextRequest, NextResponse } from "next/server"
import { createCheckout } from "@lemonsqueezy/lemonsqueezy.js"

import { configureLemonSqueezy } from "@/lib/lemon-squeezy"
import { env } from "@/lib/env"
import { requireSession } from "@/lib/session-auth"
import { SessionResult } from "@/types/session"

configureLemonSqueezy()

export async function POST(req: NextRequest): Promise<NextResponse> {
    const result: SessionResult = await requireSession()
    if (result instanceof NextResponse) return result

    const { session } = result
    const { variantId } = await req.json()
    if (!variantId)
        return NextResponse.json({ error: "Missing variantId" }, { status: 400 })

    const origin: string = req.headers.get("origin") ?? "http://localhost:3000"

    const { data, error } = await createCheckout(env.lemonSqueezyStoreId, variantId, {
        checkoutOptions: {
            embed: false,
        },
        checkoutData: {
            email: session.userId,
            custom: {
                user_id: session.userId,
            },
        },
        productOptions: {
            redirectUrl: `${origin}/billing/success`,
            receiptButtonText: "Go to billing",
        },
    })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ url: data?.data.attributes.url })
}
