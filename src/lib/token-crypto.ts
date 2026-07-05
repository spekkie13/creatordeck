import { createCipheriv, createDecipheriv, randomBytes } from "crypto"

import { env } from "@/lib/env"

/**
 * AES-256-GCM token encryption for OAuth secrets stored in `linked_accounts`.
 *
 * Ciphertext format: `enc:v1:<iv>:<tag>:<ciphertext>` where each component is
 * base64url. The `enc:v1:` prefix lets us detect still-plaintext legacy rows
 * (`isEncrypted`) so migration is incremental — a value is re-encrypted on its
 * next write, with no backfill task. The version segment allows a future
 * key/algorithm rotation to coexist with `v1` rows.
 *
 * These are pure functions and must never log their inputs.
 */

const PREFIX = "enc:v1:"
const ALGORITHM = "aes-256-gcm"
const IV_BYTES = 12 // GCM standard nonce length
const KEY_BYTES = 32 // AES-256

function getKey(): Buffer {
  const key = Buffer.from(env.tokenEncryptionKey, "base64")
  if (key.length !== KEY_BYTES) {
    throw new Error(
      `TOKEN_ENCRYPTION_KEY must decode to ${KEY_BYTES} bytes (got ${key.length}); expected a base64-encoded 32-byte key`,
    )
  }
  return key
}

/** True if the value is already in our `enc:v1:` ciphertext envelope. */
export function isEncrypted(value: string | null | undefined): boolean {
  return typeof value === "string" && value.startsWith(PREFIX)
}

/** Encrypts a plaintext token. Returns the `enc:v1:...` envelope. */
export function encrypt(plaintext: string): string {
  const iv = randomBytes(IV_BYTES)
  const cipher = createCipheriv(ALGORITHM, getKey(), iv)
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()])
  const tag = cipher.getAuthTag()
  return (
    PREFIX +
    [iv, tag, ciphertext].map((b) => b.toString("base64url")).join(":")
  )
}

/**
 * Decrypts an `enc:v1:` envelope. If the value is not encrypted (legacy
 * plaintext row) it is returned unchanged, so reads transparently handle the
 * incremental-migration window. Throws on a malformed/tampered envelope.
 */
export function decrypt(value: string): string {
  if (!isEncrypted(value)) return value

  const parts = value.slice(PREFIX.length).split(":")
  if (parts.length !== 3) {
    throw new Error("Malformed encrypted token envelope")
  }
  const [iv, tag, ciphertext] = parts.map((p) => Buffer.from(p, "base64url"))
  const decipher = createDecipheriv(ALGORITHM, getKey(), iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8")
}

/** Encrypts only if not already encrypted — safe to call on any stored value. */
export function ensureEncrypted(value: string | null | undefined): string | null {
  if (value == null || value === "") return value ?? null
  return isEncrypted(value) ? value : encrypt(value)
}