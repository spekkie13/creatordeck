import { and, eq, isNotNull } from "drizzle-orm"
import { randomBytes } from "crypto"

import type { LinkedAccount } from "@/types/entities"

import { db } from "@/lib/db"
import { users, linkedAccounts } from "@/lib/schema"
import { decrypt, ensureEncrypted } from "@/lib/token-crypto"

// OAuth tokens are encrypted at rest (AES-256-GCM, see token-crypto.ts). Writes
// go through `ensureEncrypted`; reads decrypt transparently here so every caller
// keeps receiving usable plaintext. `decrypt` is a no-op on legacy plaintext
// rows, so the two formats coexist and rows migrate to ciphertext on next write
// — no backfill task. This applies to all providers (Gate 0 decision D3).
function decryptRow<T extends LinkedAccount | null>(row: T): T {
  if (!row) return row
  return {
    ...row,
    accessToken: row.accessToken ? decrypt(row.accessToken) : row.accessToken,
    refreshToken: row.refreshToken ? decrypt(row.refreshToken) : row.refreshToken,
  }
}

type WriteData = {
  provider: string
  providerAccountId: string
  login: string
  displayName: string
  accessToken: string
  refreshToken: string
  tokenExpiresAt?: Date | null
  scopes?: string | null
  avatarUrl?: string | null
}

class LinkedAccountsRepository {
  async findByProvider(provider: string, providerAccountId: string): Promise<LinkedAccount | null> {
    const rows: LinkedAccount[] = await db.select().from(linkedAccounts)
      .where(and(eq(linkedAccounts.provider, provider), eq(linkedAccounts.providerAccountId, providerAccountId)))
      .limit(1)
    return decryptRow(rows[0] ?? null)
  }

  async findByUserId(userId: string): Promise<LinkedAccount[]> {
    const rows = await db.select().from(linkedAccounts).where(eq(linkedAccounts.userId, userId))
    return rows.map((r) => decryptRow(r))
  }

  async findByUserIdAndProvider(userId: string, provider: string): Promise<LinkedAccount | null> {
    const rows: LinkedAccount[] = await db.select().from(linkedAccounts)
      .where(and(eq(linkedAccounts.userId, userId), eq(linkedAccounts.provider, provider)))
      .limit(1)
    return decryptRow(rows[0] ?? null)
  }

  async findAllByProvider(provider: string): Promise<LinkedAccount[]> {
    const rows = await db.select().from(linkedAccounts)
      .where(and(eq(linkedAccounts.provider, provider), isNotNull(linkedAccounts.accessToken)))
    return rows.map((r) => decryptRow(r))
  }

  /**
   * Narrow accessor returning only the decrypted secrets + expiry for a user's
   * provider connection. Preferred over reading raw rows when only the tokens
   * are needed (e.g. the YouTube token-refresh path). Returns null if unlinked.
   */
  async getDecryptedTokens(
    userId: string,
    provider: string,
  ): Promise<{ accessToken: string | null; refreshToken: string | null; tokenExpiresAt: Date | null; providerAccountId: string } | null> {
    const rows = await db.select({
      accessToken: linkedAccounts.accessToken,
      refreshToken: linkedAccounts.refreshToken,
      tokenExpiresAt: linkedAccounts.tokenExpiresAt,
      providerAccountId: linkedAccounts.providerAccountId,
    }).from(linkedAccounts)
      .where(and(eq(linkedAccounts.userId, userId), eq(linkedAccounts.provider, provider)))
      .limit(1)
    const row = rows[0]
    if (!row) return null
    return {
      accessToken: row.accessToken ? decrypt(row.accessToken) : null,
      refreshToken: row.refreshToken ? decrypt(row.refreshToken) : null,
      tokenExpiresAt: row.tokenExpiresAt,
      providerAccountId: row.providerAccountId,
    }
  }

  async deleteByUserIdAndProvider(userId: string, provider: string): Promise<void> {
    await db.delete(linkedAccounts).where(
      and(eq(linkedAccounts.userId, userId), eq(linkedAccounts.provider, provider))
    )
  }

  async updateAccessToken(
    provider: string,
    providerAccountId: string,
    accessToken: string,
    tokenExpiresAt?: Date | null,
  ): Promise<void> {
    await db.update(linkedAccounts)
      .set({
        accessToken: ensureEncrypted(accessToken),
        ...(tokenExpiresAt !== undefined ? { tokenExpiresAt } : {}),
      })
      .where(and(eq(linkedAccounts.provider, provider), eq(linkedAccounts.providerAccountId, providerAccountId)))
  }

  async upsertWithUser(data: WriteData): Promise<{ userId: string; apiKey: string; tier: string }> {
    const existing = await db
      .select({ userId: linkedAccounts.userId, apiKey: users.apiKey, tier: users.tier })
      .from(linkedAccounts)
      .innerJoin(users, eq(users.id, linkedAccounts.userId))
      .where(and(
        eq(linkedAccounts.provider, data.provider),
        eq(linkedAccounts.providerAccountId, data.providerAccountId),
      ))
      .limit(1)

    const encryptedAccess = ensureEncrypted(data.accessToken)
    const encryptedRefresh = data.refreshToken ? ensureEncrypted(data.refreshToken) : null

    if (existing.length > 0) {
      await db.update(linkedAccounts)
        .set({
          login: data.login,
          displayName: data.displayName,
          accessToken: encryptedAccess,
          // Only overwrite refresh token when one is provided — Google omits it on re-logins
          ...(encryptedRefresh ? { refreshToken: encryptedRefresh } : {}),
          ...(data.tokenExpiresAt !== undefined ? { tokenExpiresAt: data.tokenExpiresAt } : {}),
          ...(data.scopes !== undefined ? { scopes: data.scopes } : {}),
          ...(data.avatarUrl !== undefined ? { avatarUrl: data.avatarUrl } : {}),
        })
        .where(and(
          eq(linkedAccounts.provider, data.provider),
          eq(linkedAccounts.providerAccountId, data.providerAccountId),
        ))
      return existing[0]
    }

    const apiKey = randomBytes(32).toString("hex")
    const [newUser] = await db.insert(users).values({ apiKey }).returning()
    await db.insert(linkedAccounts).values({
      userId: newUser.id,
      provider: data.provider,
      providerAccountId: data.providerAccountId,
      login: data.login,
      displayName: data.displayName,
      accessToken: encryptedAccess,
      refreshToken: encryptedRefresh,
      tokenExpiresAt: data.tokenExpiresAt ?? null,
      scopes: data.scopes ?? null,
      avatarUrl: data.avatarUrl ?? null,
    })
    return { userId: newUser.id, apiKey, tier: newUser.tier }
  }

  // Links a new account to an existing user (account linking flow).
  // If the account belongs to an orphaned single-account user (e.g. from a
  // broken previous linking attempt), migrates it to the current user instead.
  // Throws only if the account belongs to a different multi-account user.
  async upsertForUser(userId: string, data: WriteData): Promise<void> {
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

    const encryptedAccess = ensureEncrypted(data.accessToken)
    const encryptedRefresh = data.refreshToken ? ensureEncrypted(data.refreshToken) : null

    await db.insert(linkedAccounts)
      .values({
        userId,
        provider: data.provider,
        providerAccountId: data.providerAccountId,
        login: data.login,
        displayName: data.displayName,
        accessToken: encryptedAccess,
        refreshToken: encryptedRefresh,
        tokenExpiresAt: data.tokenExpiresAt ?? null,
        scopes: data.scopes ?? null,
        avatarUrl: data.avatarUrl ?? null,
      })
      .onConflictDoUpdate({
        target: [linkedAccounts.provider, linkedAccounts.providerAccountId],
        set: {
          login: data.login,
          displayName: data.displayName,
          accessToken: encryptedAccess,
          ...(encryptedRefresh ? { refreshToken: encryptedRefresh } : {}),
          ...(data.tokenExpiresAt !== undefined ? { tokenExpiresAt: data.tokenExpiresAt } : {}),
          ...(data.scopes !== undefined ? { scopes: data.scopes } : {}),
          ...(data.avatarUrl !== undefined ? { avatarUrl: data.avatarUrl } : {}),
        },
      })
  }
}

export const linkedAccountsRepository = new LinkedAccountsRepository()