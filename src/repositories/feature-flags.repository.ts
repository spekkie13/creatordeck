import { eq, and } from "drizzle-orm"

import { db } from "@/lib/db"
import { featureFlags, featureFlagOverrides, featureFlagAuditLog } from "@/lib/schema"
import type {
  FeatureFlag,
  InsertFeatureFlag,
  FeatureFlagOverride,
  InsertFeatureFlagAuditLog,
} from "@/types/entities"

class FeatureFlagsRepository {
  async getAll(): Promise<FeatureFlag[]> {
    return db.select().from(featureFlags).orderBy(featureFlags.name)
  }

  async getById(id: string): Promise<FeatureFlag | null> {
    const rows = await db.select().from(featureFlags).where(eq(featureFlags.id, id))
    return rows[0] ?? null
  }

  async getByName(name: string): Promise<FeatureFlag | null> {
    const rows = await db.select().from(featureFlags).where(eq(featureFlags.name, name))
    return rows[0] ?? null
  }

  async create(data: InsertFeatureFlag): Promise<FeatureFlag> {
    const rows = await db.insert(featureFlags).values(data).returning()
    return rows[0]
  }

  async update(id: string, enabled: boolean): Promise<FeatureFlag | null> {
    const rows = await db
      .update(featureFlags)
      .set({ enabled, updatedAt: new Date() })
      .where(eq(featureFlags.id, id))
      .returning()
    return rows[0] ?? null
  }

  async delete(id: string): Promise<void> {
    await db.delete(featureFlags).where(eq(featureFlags.id, id))
  }

  // Resolves flags for a user: per-user override wins over global default.
  // Returns a map of flag name → resolved boolean.
  async getResolved(userId: string): Promise<Record<string, boolean>> {
    const flags = await db.select().from(featureFlags)
    const overrides = await db
      .select()
      .from(featureFlagOverrides)
      .where(eq(featureFlagOverrides.userId, userId))

    const overrideMap = new Map(overrides.map(o => [o.flagId, o.enabled]))

    const result: Record<string, boolean> = {}
    for (const flag of flags) {
      result[flag.name] = overrideMap.has(flag.id)
        ? overrideMap.get(flag.id)!
        : flag.enabled
    }
    return result
  }

  async getOverrides(flagId: string): Promise<FeatureFlagOverride[]> {
    return db
      .select()
      .from(featureFlagOverrides)
      .where(eq(featureFlagOverrides.flagId, flagId))
  }

  async setOverride(flagId: string, userId: string, enabled: boolean): Promise<FeatureFlagOverride> {
    const rows = await db
      .insert(featureFlagOverrides)
      .values({ flagId, userId, enabled })
      .onConflictDoUpdate({
        target: [featureFlagOverrides.flagId, featureFlagOverrides.userId],
        set: { enabled },
      })
      .returning()
    return rows[0]
  }

  async removeOverride(flagId: string, userId: string): Promise<void> {
    await db
      .delete(featureFlagOverrides)
      .where(and(eq(featureFlagOverrides.flagId, flagId), eq(featureFlagOverrides.userId, userId)))
  }

  async appendAuditLog(entry: InsertFeatureFlagAuditLog): Promise<void> {
    await db.insert(featureFlagAuditLog).values(entry)
  }
}

export const featureFlagsRepository = new FeatureFlagsRepository()