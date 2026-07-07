function requireEnv(name: string): string {
    const value: string | undefined = process.env[name]
    if (!value && process.env.SKIP_ENV_VALIDATION !== 'true') {
        throw new Error(`Missing required environment variable: ${name}`)
    }
    return value ?? ''
}

export const env = {
    twitchClientId: requireEnv("TWITCH_CLIENT_ID"),
    twitchClientSecret: requireEnv("TWITCH_CLIENT_SECRET"),
    databaseUrl: requireEnv("DATABASE_URL"),
    twitchWebhookSecret: requireEnv("TWITCH_WEBHOOK_SECRET"),
    googleClientId: requireEnv("GOOGLE_CLIENT_ID"),
    googleClientSecret: requireEnv("GOOGLE_CLIENT_SECRET"),
    tokenEncryptionKey: requireEnv("TOKEN_ENCRYPTION_KEY"),
    spotifyClientId: requireEnv("SPOTIFY_CLIENT_ID"),
    spotifyClientSecret: requireEnv("SPOTIFY_CLIENT_SECRET"),
    cronSecret: requireEnv("CRON_SECRET"),
    // Lemon Squeezy is being retired in favor of Polar (see billing-polar-migration
    // branch). Read optionally so preview/prod builds stay green now that the LS env
    // vars have been deleted; the legacy /api/billing/* routes fail at runtime if hit.
    lemonSqueezyApiKey: process.env.LEMONSQUEEZY_API_KEY ?? "",
    lemonSqueezyWebhookSecret: process.env.LEMONSQUEEZY_WEBHOOK_SECRET ?? "",
    lemonSqueezyStoreId: process.env.LEMONSQUEEZY_STORE_ID ?? "",
    lemonSqueezyVariants: {
        tier1: { monthly: process.env.LEMONSQUEEZY_VARIANT_TIER1_MONTHLY ?? "", annual: process.env.LEMONSQUEEZY_VARIANT_TIER1_ANNUAL ?? "" },
        tier2: { monthly: process.env.LEMONSQUEEZY_VARIANT_TIER2_MONTHLY ?? "", annual: process.env.LEMONSQUEEZY_VARIANT_TIER2_ANNUAL ?? "" },
        tier3: { monthly: process.env.LEMONSQUEEZY_VARIANT_TIER3_MONTHLY ?? "", annual: process.env.LEMONSQUEEZY_VARIANT_TIER3_ANNUAL ?? "" },
    },
}
