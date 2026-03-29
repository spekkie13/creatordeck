function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Missing required environment variable: ${name}`)
  return value
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
  stripeSecretKey: requireEnv("STRIPE_SECRET_KEY"),
  stripeWebhookSecret: requireEnv("STRIPE_WEBHOOK_SECRET"),
  stripePrices: {
    tier1: { monthly: requireEnv("STRIPE_PRICE_TIER1_MONTHLY"), annual: requireEnv("STRIPE_PRICE_TIER1_ANNUAL") },
    tier2: { monthly: requireEnv("STRIPE_PRICE_TIER2_MONTHLY"), annual: requireEnv("STRIPE_PRICE_TIER2_ANNUAL") },
    tier3: { monthly: requireEnv("STRIPE_PRICE_TIER3_MONTHLY"), annual: requireEnv("STRIPE_PRICE_TIER3_ANNUAL") },
  },
}
