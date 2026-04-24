import type {
  users,
  linkedAccounts,
  subEvents,
  followEvents,
  cheerEvents,
  raidEvents,
  streamSessions,
  subGoals,
  waitlist,
  eventsubSubscriptions,
  ytSuperChatEvents,
  ytMemberEvents,
  ytStreamSessions,
  featureFlags,
  featureFlagOverrides,
  featureFlagAuditLog,
} from "@/lib/schema"

export type User = typeof users.$inferSelect
export type InsertUser = typeof users.$inferInsert

export type LinkedAccount = typeof linkedAccounts.$inferSelect
export type InsertLinkedAccount = typeof linkedAccounts.$inferInsert

export type SubEvent = typeof subEvents.$inferSelect
export type InsertSubEvent = typeof subEvents.$inferInsert

export type FollowEvent = typeof followEvents.$inferSelect
export type InsertFollowEvent = typeof followEvents.$inferInsert

export type CheerEvent = typeof cheerEvents.$inferSelect
export type InsertCheerEvent = typeof cheerEvents.$inferInsert

export type RaidEvent = typeof raidEvents.$inferSelect
export type InsertRaidEvent = typeof raidEvents.$inferInsert

export type StreamSession = typeof streamSessions.$inferSelect
export type InsertStreamSession = typeof streamSessions.$inferInsert

export type SubGoal = typeof subGoals.$inferSelect
export type InsertSubGoal = typeof subGoals.$inferInsert

export type WaitlistEntry = typeof waitlist.$inferSelect
export type InsertWaitlistEntry = typeof waitlist.$inferInsert

export type EventSubSubscription = typeof eventsubSubscriptions.$inferSelect
export type InsertEventSubSubscription = typeof eventsubSubscriptions.$inferInsert

export type YtSuperChatEvent = typeof ytSuperChatEvents.$inferSelect
export type InsertYtSuperChatEvent = typeof ytSuperChatEvents.$inferInsert

export type YtMemberEvent = typeof ytMemberEvents.$inferSelect
export type InsertYtMemberEvent = typeof ytMemberEvents.$inferInsert

export type YtStreamSession = typeof ytStreamSessions.$inferSelect
export type InsertYtStreamSession = typeof ytStreamSessions.$inferInsert

export type FeatureFlag = typeof featureFlags.$inferSelect
export type InsertFeatureFlag = typeof featureFlags.$inferInsert

export type FeatureFlagOverride = typeof featureFlagOverrides.$inferSelect
export type InsertFeatureFlagOverride = typeof featureFlagOverrides.$inferInsert

export type FeatureFlagAuditLog = typeof featureFlagAuditLog.$inferSelect
export type InsertFeatureFlagAuditLog = typeof featureFlagAuditLog.$inferInsert