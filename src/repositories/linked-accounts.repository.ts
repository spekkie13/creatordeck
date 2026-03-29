import { and, eq, isNotNull } from "drizzle-orm"
import { randomBytes } from "crypto"
import { db } from "@/lib/db"
import { users, linkedAccounts } from "@/lib/schema"
import type { LinkedAccount } from "@/types/entities"

class LinkedAccountsRepository {
  async findByProvider(provider: string, providerAccountId: string): Promise<LinkedAccount | null> {
    const rows = await db.select().from(linkedAccounts)
      .where(and(eq(linkedAccounts.provider, provider), eq(linkedAccounts.providerAccountId, providerAccountId)))
      .limit(1)
    return rows[0] ?? null
  }

  async findByUserId(userId: string): Promise<LinkedAccount[]> {
    return db.select().from(linkedAccounts).where(eq(linkedAccounts.userId, userId))
  }

  async findAllByProvider(provider: string): Promise<LinkedAccount[]> {
    return db.select().from(linkedAccounts)
      .where(and(eq(linkedAccounts.provider, provider), isNotNull(linkedAccounts.accessToken)))
  }

  async deleteByUserIdAndProvider(userId: string, provider: string): Promise<void> {
    await db.delete(linkedAccounts).where(
      and(eq(linkedAccounts.userId, userId), eq(linkedAccounts.provider, provider))
    )
  }

  async updateAccessToken(provider: string, providerAccountId: string, accessToken: string): Promise<void> {
    await db.update(linkedAccounts)
      .set({ accessToken })
      .where(and(eq(linkedAccounts.provider, provider), eq(linkedAccounts.providerAccountId, providerAccountId)))
  }

  // Finds or creates a user+account pair, updates tokens on subsequent sign-ins.
  // Returns the internal userId, apiKey, and subscription tier.
  async upsertWithUser(data: {
    provider: string
    providerAccountId: string
    login: string
    displayName: string
    accessToken: string
    refreshToken: string
  }): Promise<{ userId: string; apiKey: string; tier: string }> {
    const existing = await db
      .select({ userId: linkedAccounts.userId, apiKey: users.apiKey, tier: users.tier })
      .from(linkedAccounts)
      .innerJoin(users, eq(users.id, linkedAccounts.userId))
      .where(and(
        eq(linkedAccounts.provider, data.provider),
        eq(linkedAccounts.providerAccountId, data.providerAccountId),
      ))
      .limit(1)

    if (existing.length > 0) {
      await db.update(linkedAccounts)
        .set({
          login: data.login,
          displayName: data.displayName,
          accessToken: data.accessToken,
          // Only overwrite refresh token when one is provided — Google omits it on re-logins
          ...(data.refreshToken ? { refreshToken: data.refreshToken } : {}),
        })
        .where(and(
          eq(linkedAccounts.provider, data.provider),
          eq(linkedAccounts.providerAccountId, data.providerAccountId),
        ))
      return existing[0]
    }

    const apiKey = randomBytes(32).toString("hex")
    const [newUser] = await db.insert(users).values({ apiKey }).returning()
    await db.insert(linkedAccounts).values({ userId: newUser.id, ...data })
    return { userId: newUser.id, apiKey, tier: newUser.tier }
  }

  // Links a new account to an existing user (account linking flow).
  // If the account belongs to an orphaned single-account user (e.g. from a
  // broken previous linking attempt), migrates it to the current user instead.
  // Throws only if the account belongs to a different multi-account user.
  async upsertForUser(userId: string, data: {
    provider: string
    providerAccountId: string
    login: string
    displayName: string
    accessToken: string
    refreshToken: string
  }): Promise<void> {
    const existing: LinkedAccount | null = await this.findByProvider(data.provider, data.providerAccountId)

    if (existing && existing.userId !== userId) {
      // Check if the conflicting user is orphaned (only has this one account)
      const conflictingAccounts = await this.findByUserId(existing.userId)
      if (conflictingAccounts.length === 1) {
        // Safe to migrate: delete the orphaned user (cascades to their linked_accounts)
        await db.delete(users).where(eq(users.id, existing.userId))
      } else {
        throw new Error(`This ${data.provider} account is already linked to a different user`)
      }
    }

    await db.insert(linkedAccounts)
      .values({ userId, ...data })
      .onConflictDoUpdate({
        target: [linkedAccounts.provider, linkedAccounts.providerAccountId],
        set: {
          login: data.login,
          displayName: data.displayName,
          accessToken: data.accessToken,
          ...(data.refreshToken ? { refreshToken: data.refreshToken } : {}),
        },
      })
  }
}

export const linkedAccountsRepository = new LinkedAccountsRepository()
