import {env} from '@/lib/env'
import {buildVariantTierMap} from '@/lib/gates'
import {NoCustomerFoundException, UnknownVariantException} from '@/lib/exceptions'
import {getSubscription, Subscription} from "@lemonsqueezy/lemonsqueezy.js"

import {userRepository} from '@/repositories'
import {PaidSubscriptionTier} from "@/types/tier";

const variantTierMap: Record<string, PaidSubscriptionTier> = buildVariantTierMap(env.lemonSqueezyVariants)

class BillingService {
    async handleCheckoutCompleted(userId: string, customerId: string, subscriptionId: string): Promise<void> {
        const {data} = await getSubscription(subscriptionId)
        const variantId: number | undefined = data?.data.attributes.variant_id
        const tier: PaidSubscriptionTier | null = variantId ? variantTierMap[variantId] : null

        if (!tier) throw new UnknownVariantException(`Unrecognised variantId: ${variantId}`)

        await userRepository.setCustomer(userId, customerId, subscriptionId)
        await userRepository.setTier(userId, tier)
    }

    async handleSubscriptionUpdated(customerId: string, subscription: Subscription): Promise<void> {
        const user = await userRepository.findByCustomerId(customerId)
        if (!user) throw new NoCustomerFoundException(`No user found for customerId: ${customerId}`)

        const variantId: string = subscription.data.attributes.variant_id.toString()
        const tier: PaidSubscriptionTier = variantTierMap[variantId] ?? null

        if (subscription.data.attributes.status === 'active' && tier && !subscription.data.attributes.cancelled) {
            await userRepository.setTier(user.id, tier)
        }

        await userRepository.setCustomer(user.id, customerId, subscription.data.id.toString())
    }

    async handleSubscriptionDeleted(customerId: string): Promise<void> {
        const user = await userRepository.findByCustomerId(customerId)
        if (!user) throw new NoCustomerFoundException(`No user found for customerId: ${customerId}`)

        await userRepository.setTier(user.id, 'free')
        await userRepository.clearSubscription(user.id)
    }
}

export const billingService = new BillingService()
