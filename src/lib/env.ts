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
    // Polar billing. Read optionally (not requireEnv) so the app builds before
    // the Polar sandbox is configured; the billing routes fail at runtime until
    // these are set. Flip to requireEnv once Polar is live (Phase 3).
    polarAccessToken: process.env.POLAR_ACCESS_TOKEN ?? "",
    polarWebhookSecret: process.env.POLAR_WEBHOOK_SECRET ?? "",
    polarServer: (process.env.POLAR_SERVER ?? "sandbox") as "sandbox" | "production",
    polarProductProMonthly: process.env.POLAR_PRODUCT_PRO_MONTHLY ?? "",
    polarProductProYearly: process.env.POLAR_PRODUCT_PRO_YEARLY ?? "",
}
