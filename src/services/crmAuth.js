/**
 * CRM token lifecycle manager.
 *
 * Fetches a short-lived RS256 JWT from the application backend and caches it
 * in memory until 30 seconds before expiry. Concurrent callers share a single
 * in-flight request so the backend is never hit more than once at a time.
 *
 * Security rules:
 *   – Token lives only in module-scoped variables (never localStorage,
 *     sessionStorage, URL parameters, Redux, logs, or error messages).
 *   – clearCrmToken() is called on 401 responses and on logout.
 */

import { AUTH_URL } from "../store/constants";

/* ── private state ──────────────────────────────────────────────────────── */

let cachedToken = null;
let expiresAt = 0;
/** @type {Promise<string> | null} */
let inflightRequest = null;

/* ── internal ───────────────────────────────────────────────────────────── */

/**
 * Fetch a fresh CRM access token from the application backend.
 *
 * Uses native fetch (not Axios) to avoid circular dependencies — crmClient
 * imports this module, and api.js imports crmClient.
 */
async function fetchToken() {
  const url = `${AUTH_URL}?controller=auth&action=me`;

  const response = await fetch(url, { credentials: "include" });

  if (!response.ok) {
    // Never include the response body; it could contain sensitive data.
    cachedToken = null;
    expiresAt = 0;
    throw new Error("CRM token request failed");
  }

  const data = await response.json();

  const token = data?.crm_access_token;
  const expiresIn = Number(data?.crm_access_token_expires_in) || 600;

  if (!token) {
    throw new Error("CRM token request returned no token");
  }

  cachedToken = token;
  // Cache until 30 seconds before the server-reported expiry.
  expiresAt = Date.now() + (expiresIn - 30) * 1000;

  return token;
}

/* ── public API ─────────────────────────────────────────────────────────── */

/**
 * Return a valid CRM access token, fetching one if the cache is empty or
 * about to expire.
 *
 * Multiple concurrent callers share the same in-flight fetch so the backend
 * is never asked twice at the same time.
 *
 * @returns {Promise<string>}
 */
export async function getCrmToken() {
  // 1. Cached and still valid → return immediately.
  if (cachedToken && Date.now() < expiresAt) {
    return cachedToken;
  }

  // 2. Another caller is already fetching → piggyback on that request.
  if (inflightRequest) {
    return inflightRequest;
  }

  // 3. Fetch a new token and store the promise so concurrent callers share it.
  inflightRequest = fetchToken().finally(() => {
    inflightRequest = null;
  });

  return inflightRequest;
}

/**
 * Clear the cached CRM token.
 *
 * Call this after a CRM 401 response or when the user logs out so the next
 * getCrmToken() call fetches a fresh token.
 */
export function clearCrmToken() {
  cachedToken = null;
  expiresAt = 0;
  // If a fetch is in-flight it will finish on its own — the result will be
  // stored and then be valid.  Clearing the reference here would not cancel
  // the network request anyway, but we *don't* clear it so concurrent callers
  // waiting on it still get a usable token.
}
