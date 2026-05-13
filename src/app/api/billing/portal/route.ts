import { NextRequest, NextResponse } from "next/server"
import { getSubscription } from "@lemonsqueezy/lemonsqueezy.js"

import { configureLemonSqueezy } from "@/lib/lemon-squeezy"
import { requireSession } from "@/lib/session-auth"
import { userRepository } from "@/repositories"
import {SessionResult} from "@/types/session";

configureLemonSqueezy()

export async function POST(req: NextRequest) {
    const result: SessionResult = await requireSession()
    if (result instanceof NextResponse) return result
    const { session } = result

    const { subscriptionId } = await userRepository.getCustomerInfo(session.userId)
    if (!subscriptionId)
        return NextResponse.json({ error: "No subscription found" }, { status: 400 })

    const { data, error } = await getSubscription(subscriptionId)
    if (error || !data)
        return NextResponse.json({ error: "Failed to fetch subscription" }, { status: 500 })

    const portalUrl: string = data.data.attributes.urls.customer_portal

    return NextResponse.json({ url: portalUrl })
}
