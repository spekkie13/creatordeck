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
    // Polar billing env is added in Phase 1 (checkout/portal/webhook adapters).
}
