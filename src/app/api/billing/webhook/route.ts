import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

import { env } from '@/lib/env'
import { NoCustomerFoundException, UnknownVariantException } from '@/lib/exceptions'
import { billingService } from '@/services'
import {Hmac} from "node:crypto";

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
    const body = await req.text()
    const signature = req.headers.get('x-signature')
    if (!signature) return NextResponse.json({ error: 'Missing signature' }, { status: 400 })

    const hmac: Hmac = crypto.createHmac('sha256', env.lemonSqueezyWebhookSecret)
    const digest: string = hmac.update(body).digest('hex')
    if (digest !== signature)
        return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })

    const payload = JSON.parse(body)
    const eventName: string = payload.meta?.event_name

    switch (eventName) {
        case 'subscription_created': {
            const userId = payload.meta?.custom_data?.user_id
            const customerId = payload.data?.attributes?.customer_id?.toString()
            const subscriptionId = payload.data?.id?.toString()
            try {
                await billingService.handleCheckoutCompleted(userId, customerId, subscriptionId)
            } catch (err) {
                if (err instanceof UnknownVariantException) {
                    console.warn('[ls/webhook] subscription_created unknown variant', { message: (err as Error).message })
                } else throw err
            }
            break
        }

        case 'subscription_updated': {
            const customerId: string = payload.data?.attributes?.customer_id?.toString()
            try {
                await billingService.handleSubscriptionUpdated(customerId, payload.data)
            } catch (err) {
                if (err instanceof NoCustomerFoundException) {
                    console.warn('[ls/webhook] subscription_updated', { message: (err as Error).message })
                } else throw err
            }
            break
        }

        case 'subscription_cancelled': {
            const customerId = payload.data?.attributes?.customer_id?.toString()
            try {
                await billingService.handleSubscriptionDeleted(customerId)
            } catch (err) {
                if (err instanceof NoCustomerFoundException) {
                    console.warn('[ls/webhook] subscription_cancelled', { message: (err as Error).message })
                } else throw err
            }
            break
        }
    }

    return NextResponse.json({ received: true })
}
