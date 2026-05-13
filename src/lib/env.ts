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
    spotifyClientId: requireEnv("SPOTIFY_CLIENT_ID"),
    spotifyClientSecret: requireEnv("SPOTIFY_CLIENT_SECRET"),
    cronSecret: requireEnv("CRON_SECRET"),
    lemonSqueezyApiKey: requireEnv("LEMONSQUEEZY_API_KEY"),
    lemonSqueezyWebhookSecret: requireEnv("LEMONSQUEEZY_WEBHOOK_SECRET"),
    lemonSqueezyStoreId: requireEnv("LEMONSQUEEZY_STORE_ID"),
    lemonSqueezyVariants: {
        tier1: { monthly: requireEnv("LEMONSQUEEZY_VARIANT_TIER1_MONTHLY"), annual: requireEnv("LEMONSQUEEZY_VARIANT_TIER1_ANNUAL") },
        tier2: { monthly: requireEnv("LEMONSQUEEZY_VARIANT_TIER2_MONTHLY"), annual: requireEnv("LEMONSQUEEZY_VARIANT_TIER2_ANNUAL") },
        tier3: { monthly: requireEnv("LEMONSQUEEZY_VARIANT_TIER3_MONTHLY"), annual: requireEnv("LEMONSQUEEZY_VARIANT_TIER3_ANNUAL") },
    },
}
