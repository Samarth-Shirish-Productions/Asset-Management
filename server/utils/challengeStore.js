/**
 * In-memory challenge store for WebAuthn passkey flows.
 *
 * Why not cookies?
 * The frontend (localhost:5173) and backend (localhost:5000) are on different ports.
 * Even with SameSite=lax, browsers treat different ports as cross-site in some
 * environments. Storing the challenge server-side and passing a lookup token to
 * the client is the most reliable dev + production approach.
 *
 * Structure: Map<token, { challenge: string, expiresAt: number }>
 */

const store = new Map();
const TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Save a challenge and return a short-lived lookup token.
 * @param {string} challenge - The base64url challenge from SimpleWebAuthn
 * @returns {string} token - An opaque token to return to the client
 */
function saveChallenge(challenge) {
  const crypto = require('crypto');
  const token = crypto.randomBytes(24).toString('base64url');
  store.set(token, { challenge, expiresAt: Date.now() + TTL_MS });
  // Prune expired entries lazily on every save
  for (const [k, v] of store.entries()) {
    if (v.expiresAt < Date.now()) store.delete(k);
  }
  return token;
}

/**
 * Consume (read + delete) a challenge by its token.
 * Returns null if the token is missing or expired.
 * @param {string} token
 * @returns {string|null} challenge
 */
function consumeChallenge(token) {
  if (!token) return null;
  const entry = store.get(token);
  if (!entry) return null;
  store.delete(token); // one-time use
  if (entry.expiresAt < Date.now()) return null;
  return entry.challenge;
}

module.exports = { saveChallenge, consumeChallenge };
