import { pgTable, text, timestamp, integer, uuid, boolean, bigint, unique, pgEnum } from "drizzle-orm/pg-core"

// Legacy 3-tier enum — retained only so `users.tier` (now nullable) can be
// backfilled/read during the Polar migration window. Dropped in Phase 3 once
// nothing references it; the live model is `plan` (free|pro) on `entitlements`.
export const subscriptionTier = pgEnum("subscription_tier", ["free", "tier1", "tier2", "tier3"])

export const plan = pgEnum("plan", ["free", "pro"])
export const entitlementStatus = pgEnum("entitlement_status", [
  "none",
  "trialing",
  "active",
  "canceled_active",
  "past_due",
  "revoked",
])

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  apiKey: text("api_key").unique().notNull(),
  widgetToken: text("widget_token").unique(),
  onboardingCompleted: boolean("onboarding_completed").notNull().default(false),
  tier: subscriptionTier("tier"), // legacy, nullable — see note above
  isAdmin: boolean("is_admin").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

// Webhook-driven local cache of a user's Pro entitlement (spec §3.2). Never
// call Polar on the hot path — this row is the source of truth, mutated only by
// verified webhooks (plus trial/owner logic).
export const entitlements = pgTable("entitlements", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  plan: plan("plan").notNull().default("free"),
  status: entitlementStatus("status").notNull().default("none"),
  polarCustomerId: text("polar_customer_id").unique(),
  polarSubscriptionId: text("polar_subscription_id").unique(),
  currentPeriodEnd: timestamp("current_period_end"),
  trialEndsAt: timestamp("trial_ends_at"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

// Idempotency ledger (spec §3.3): insert the Polar event id first; a unique
// violation means we already processed it → ack 200 and skip.
export const webhookEvents = pgTable("webhook_events", {
  id: text("id").primaryKey(), // Polar event id
  type: text("type").notNull(),
  processedAt: timestamp("processed_at").defaultNow().notNull(),
})

// One row per (provider, providerAccountId) — a user can have multiple linked accounts
export const linkedAccounts = pgTable("linked_accounts", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  provider: text("provider").notNull(),
  providerAccountId: text("provider_account_id").notNull(),
  login: text("login"),
  displayName: text("display_name"),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  tokenExpiresAt: timestamp("token_expires_at"),
  scopes: text("scopes"),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  providerAccountUnique: unique().on(t.provider, t.providerAccountId),
}))

export const subEvents = pgTable("sub_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  broadcasterId: text("broadcaster_id").notNull(),
  eventId: text("event_id").unique().notNull(),
  userId: text("user_id"),
  userLogin: text("user_login"),
  userDisplayName: text("user_display_name"),
  gifterId: text("gifter_id"),
  gifterLogin: text("gifter_login"),
  gifterDisplayName: text("gifter_display_name"),
  tier: text("tier").notNull(),
  kind: text("kind").notNull(),
  giftCount: integer("gift_count").default(1),
  cumulativeMonths: integer("cumulative_months"),
  message: text("message"),
  occurredAt: timestamp("occurred_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

export const subGoals = pgTable("sub_goals", {
  broadcasterId: text("broadcaster_id").primaryKey(),
  goal: integer("goal").notNull().default(100),
  initialCount: integer("initial_count").notNull().default(0),
  endsAt: timestamp("ends_at"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

export const eventsubSubscriptions = pgTable("eventsub_subscriptions", {
  id: text("id").primaryKey(),
  broadcasterId: text("broadcaster_id").notNull(),
  type: text("type").notNull(),
  status: text("status").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

export const followEvents = pgTable("follow_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  broadcasterId: text("broadcaster_id").notNull(),
  eventId: text("event_id").unique().notNull(),
  userId: text("user_id"),
  userLogin: text("user_login"),
  userDisplayName: text("user_display_name"),
  occurredAt: timestamp("occurred_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  broadcasterUserUnique: unique().on(t.broadcasterId, t.userId),
}))

export const cheerEvents = pgTable("cheer_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  broadcasterId: text("broadcaster_id").notNull(),
  eventId: text("event_id").unique().notNull(),
  userId: text("user_id"),
  userLogin: text("user_login"),
  userDisplayName: text("user_display_name"),
  bits: integer("bits").notNull(),
  message: text("message"),
  isAnonymous: boolean("is_anonymous").notNull().default(false),
  occurredAt: timestamp("occurred_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

export const raidEvents = pgTable("raid_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  broadcasterId: text("broadcaster_id").notNull(),
  eventId: text("event_id").unique().notNull(),
  fromBroadcasterId: text("from_broadcaster_id").notNull(),
  fromBroadcasterLogin: text("from_broadcaster_login").notNull(),
  fromBroadcasterDisplayName: text("from_broadcaster_display_name").notNull(),
  viewerCount: integer("viewer_count").notNull(),
  occurredAt: timestamp("occurred_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

export const streamSessions = pgTable("stream_sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  broadcasterId: text("broadcaster_id").notNull(),
  startedAt: timestamp("started_at").notNull(),
  endedAt: timestamp("ended_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

export const waitlist = pgTable("waitlist", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").unique().notNull(),
  twitchLogin: text("twitch_login"),
  interestedTier: text("interested_tier"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

export const ytSuperChatEvents = pgTable("yt_superchat_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  channelId: text("channel_id").notNull(),
  eventId: text("event_id").unique().notNull(),
  userId: text("user_id"),
  userDisplayName: text("user_display_name"),
  amountMicros: bigint("amount_micros", { mode: "number" }).notNull(),
  currency: text("currency").notNull(),
  message: text("message"),
  occurredAt: timestamp("occurred_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

export const ytMemberEvents = pgTable("yt_member_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  channelId: text("channel_id").notNull(),
  eventId: text("event_id").unique().notNull(),
  userId: text("user_id"),
  userDisplayName: text("user_display_name"),
  memberMonths: integer("member_months").notNull(),
  levelName: text("level_name"),
  occurredAt: timestamp("occurred_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

export const feedback = pgTable("feedback", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  message: text("message").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

// Additional goals beyond Twitch subs (which remain in sub_goals)
// type: "twitch_follow" | "youtube_member"
export const goals = pgTable("goals", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  goal: integer("goal").notNull().default(100),
  endsAt: timestamp("ends_at"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => ({
  userTypeUnique: unique().on(t.userId, t.type),
}))

export const eventReplays = pgTable("event_replays", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  eventData: text("event_data").notNull(), // serialized LiveEvent JSON
  createdAt: timestamp("created_at").defaultNow().notNull(),
  processedAt: timestamp("processed_at"),
})

export const ytStreamSessions = pgTable("yt_stream_sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  channelId: text("channel_id").notNull(),
  broadcastId: text("broadcast_id").notNull(),
  title: text("title"),
  liveChatId: text("live_chat_id"),
  chatPageToken: text("chat_page_token"),
  pollCount: integer("poll_count").notNull().default(0),
  quotaUnits: integer("quota_units").notNull().default(0),
  lastPolledAt: timestamp("last_polled_at"),
  startedAt: timestamp("started_at").notNull(),
  endedAt: timestamp("ended_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

export const featureFlags = pgTable("feature_flags", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").unique().notNull(),
  description: text("description"),
  enabled: boolean("enabled").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

export const featureFlagOverrides = pgTable("feature_flag_overrides", {
  id: uuid("id").defaultRandom().primaryKey(),
  flagId: uuid("flag_id").notNull().references(() => featureFlags.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  enabled: boolean("enabled").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  flagUserUnique: unique().on(t.flagId, t.userId),
}))

export const featureFlagAuditLog = pgTable("feature_flag_audit_log", {
  id: uuid("id").defaultRandom().primaryKey(),
  flagName: text("flag_name").notNull(),
  actorId: uuid("actor_id").notNull(),
  changeType: text("change_type").notNull(), // "created" | "updated" | "deleted" | "override_set" | "override_removed"
  previousValue: boolean("previous_value"),
  newValue: boolean("new_value"),
  targetUserId: uuid("target_user_id"),
  occurredAt: timestamp("occurred_at").defaultNow().notNull(),
})
