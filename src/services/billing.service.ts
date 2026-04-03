import type Stripe from 'stripe'

import { env } from '@/lib/env'
import { buildPriceTierMap } from '@/lib/gates'
import { stripe } from '@/lib/stripe'
import { NoStripeCustomerFoundException, UnknownStripePriceException } from '@/lib/exceptions'

import { userRepository } from '@/repositories'

const priceTierMap = buildPriceTierMap(env.stripePrices)

function getPriceId(subscription: Stripe.Subscription): string | null {
  return subscription.items.data[0]?.price.id ?? null
}

class BillingService {
  async handleCheckoutCompleted(userId: string, customerId: string, subscriptionId: string): Promise<void> {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId)
    const priceId = getPriceId(subscription)
    const tier = priceId ? priceTierMap[priceId] : null

    if (!tier) throw new UnknownStripePriceException(`Unrecognised priceId: ${priceId}`)

    await userRepository.setStripeCustomer(userId, customerId, subscriptionId)
    await userRepository.setTier(userId, tier)
  }

  async handleSubscriptionUpdated(customerId: string, subscription: Stripe.Subscription): Promise<void> {
    const user = await userRepository.findByStripeCustomerId(customerId)
    if (!user) throw new NoStripeCustomerFoundException(`No user found for customerId: ${customerId}`)

    const priceId = getPriceId(subscription)
    const tier = priceId ? priceTierMap[priceId] : null

    // Only update tier if active — cancel_at_period_end keeps current tier until subscription.deleted
    if (subscription.status === 'active' && tier && !subscription.cancel_at_period_end) {
      await userRepository.setTier(user.id, tier)
    }

    await userRepository.setStripeCustomer(user.id, customerId, subscription.id)
  }

  async handleSubscriptionDeleted(customerId: string): Promise<void> {
    const user = await userRepository.findByStripeCustomerId(customerId)
    if (!user) throw new NoStripeCustomerFoundException(`No user found for customerId: ${customerId}`)

    await userRepository.setTier(user.id, 'free')
    await userRepository.clearStripeSubscription(user.id)
  }
}

export const billingService = new BillingService()
