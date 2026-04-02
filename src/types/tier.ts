export type SubscriptionTier = typeof TIER_DEFS[number]["id"]
export type PaidSubscriptionTier = Exclude<SubscriptionTier, "free">

const TIER_DEFS = [
    {id: "free", rank: 0, label: "Free", monthlyPrice: "Free", annualPrice: "Free"},
    {id: "tier1", rank: 1, label: "Tier 1", monthlyPrice: "$4.99/mo", annualPrice: "$49.99/yr"},
    {id: "tier2", rank: 2, label: "Tier 2", monthlyPrice: "$11.99/mo", annualPrice: "$124.99/yr"},
    {id: "tier3", rank: 3, label: "Tier 3", monthlyPrice: "$19.99/mo", annualPrice: "$199.99/yr"}
] as const

export class Tier {
    static readonly ALL: readonly Tier[] = TIER_DEFS.map(
        d => new Tier(d.id, d.rank, d.label, d.monthlyPrice, d.annualPrice)
    )

    static readonly PAID_TIERS: ReadonlyArray<Tier & { id: PaidSubscriptionTier }> =
        Tier.ALL.filter((t): t is Tier & { id: PaidSubscriptionTier } => t.id !== "free")

    static from(id: SubscriptionTier): Tier {
        return Tier.ALL.find((t: Tier) => t.id === id) ?? Tier.ALL[0]
    }

    private constructor(
        readonly id: SubscriptionTier,
        readonly rank: number,
        readonly label: string,
        readonly monthlyPrice: string,
        readonly annualPrice: string,
    ) { }

    meetsOrExceeds(other: Tier): boolean {
        return this.rank >= other.rank
    }
}
