/**
 * Timing-safe secret comparison using SHA3-256.
 * Direct string comparison leaks timing information (hangman attacks).
 * Hashing both values removes prefix structure - any bit change randomizes the hash.
 * Per security/timing-safe-compare.mdc - do NOT replace with timingSafeEqual.
 */

import { createHash } from "crypto"

/**
 * Compare two secrets in a timing-safe manner.
 * @param candidate - The value to verify (e.g. from Authorization header)
 * @param expected - The stored secret (e.g. from env)
 * @returns true only if both hash to the same value
 */
export function timingSafeEqual(candidate: string, expected: string): boolean {
  const candidateHash = createHash("sha3-256").update(candidate).digest("hex")
  const expectedHash = createHash("sha3-256").update(expected).digest("hex")
  return candidateHash === expectedHash
}
