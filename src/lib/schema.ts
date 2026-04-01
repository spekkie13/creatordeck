import { pgTable, text, timestamp, integer, uuid, boolean, bigint, unique, pgEnum } from "drizzle-orm/pg-core"

export const subscriptionTier = pgEnum("subscription_tier", ["free", "tier1", "tier2", "tier3"])

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  apiKey: text("api_key").unique().notNull(),
  widgetToken: text("widget_token").unique(),
  onboardingCompleted: boolean("onboarding_completed").notNull().default(false),
  tier: subscriptionTier("tier").notNull().default("free"),
  stripeCustomerId: text("stripe_customer_id").unique(),
  stripeSubscriptionId: text("stripe_subscription_id").unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
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

export const chatMessages = pgTable("chat_messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  platform: text("platform").notNull(),
  channelId: text("channel_id").notNull(), // broadcasterId (Twitch) or channelId (YouTube)
  eventId: text("event_id").unique().notNull(), // dedup key
  userId: text("user_id"),
  userLogin: text("user_login"),
  userDisplayName: text("user_display_name"),
  message: text("message").notNull(),
  occurredAt: timestamp("occurred_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

export const ytStreamSessions = pgTable("yt_stream_sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  channelId: text("channel_id").notNull(),
  broadcastId: text("broadcast_id").notNull(),
  title: text("title"),
  startedAt: timestamp("started_at").notNull(),
  endedAt: timestamp("ended_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})
