/**
 * Source-level CRM HTTP client.
 *
 * Provides two ways to reach the CRM:
 *
 *   1. `crmClient`  – an Axios instance with interceptors that attach the
 *      Bearer token.  Drop-in replacement for the old `apiClient` in api.js.
 *
 *   2. `crmFetch()` – a thin wrapper around native `fetch()` that adds the
 *      Bearer token while preserving the Response API for callers that need
 *      streaming, abort signals, or manual `.json()` handling.
 *
 * Both paths:
 *   – Attach `Authorization: Bearer <token>` only for requests to
 *     https://kartikey.hrcrm.ai/index.php with an allowed entry point
 *     (smart_gateway, flexibility, sidebar, hrc).
 *   – Strip the legacy `email` query param from Sidebar requests.
 *   – On a CRM 401, clear the cached token and retry exactly once.
 *   – Never retry 403 responses.
 *
 * No global XHR, fetch, or prototype monkey-patching is used.
 */

import axios from "axios";
import { getCrmToken, clearCrmToken } from "./crmAuth";

/* ── constants ──────────────────────────────────────────────────────────── */

const CRM_URL_PREFIX = "https://kartikey.hrcrm.ai/";

const ALLOWED_ENTRY_POINTS = new Set([
  "smart_gateway",
  "flexibility",
  "sidebar",
  "hrc",
]);

/* ── UI module identity ─────────────────────────────────────────────────── */

/** @type {string | null} */
let activeUiModuleId = null;

/**
 * Set the UI module ID that will be injected into smart_gateway requests.
 * Call this when the user selects a sidebar module.
 */
export function setActiveUiModule(id) {
  activeUiModuleId = id || null;
}

/** Return the currently active UI module ID (may be null). */
export function getActiveUiModule() {
  return activeUiModuleId;
}

/* ── helpers ────────────────────────────────────────────────────────────── */

/**
 * Parse the entry point from an Axios config, checking both `config.params`
 * and the URL query string.
 *
 * @returns {string | null} The entry point if the request targets the CRM
 *   with an allowed entry point, or `null` otherwise.
 */
function getCrmEntryPoint(config) {
  const url = config.url || "";
  if (!url.startsWith(CRM_URL_PREFIX)) return null;

  // 1. Entry point may be in the params object (e.g. sidebar, flexibility).
  let entryPoint = config.params?.entryPoint;

  // 2. Or baked into the URL string (e.g. smart_gateway, hrc).
  if (!entryPoint) {
    const qIndex = url.indexOf("?");
    if (qIndex !== -1) {
      const searchParams = new URLSearchParams(url.substring(qIndex));
      entryPoint = searchParams.get("entryPoint");
    }
  }

  return entryPoint && ALLOWED_ENTRY_POINTS.has(entryPoint) ? entryPoint : null;
}

/* ── Axios instance ─────────────────────────────────────────────────────── */

export const crmClient = axios.create();

/*
 * REQUEST interceptor — attach Bearer token for CRM requests.
 */
crmClient.interceptors.request.use(async (config) => {
  const entryPoint = getCrmEntryPoint(config);
  if (!entryPoint) return config;

  // Attach CRM Bearer token.
  const token = await getCrmToken();
  config.headers = config.headers || {};
  config.headers.Authorization = `Bearer ${token}`;

  // Strip legacy email param from Sidebar requests.
  if (entryPoint === "sidebar" && config.params) {
    const { email, ...rest } = config.params;
    config.params = rest;
  }

  // Inject the UI module ID into smart_gateway POST bodies.
  if (
    entryPoint === "smart_gateway" &&
    activeUiModuleId &&
    config.data &&
    typeof config.data === "object" &&
    !(config.data instanceof FormData)
  ) {
    config.data = { ...config.data, ui_module_id: activeUiModuleId };
  }

  return config;
});

/*
 * RESPONSE interceptor — 401 retry (once) for CRM requests.
 *
 * On a 401 the cached token is cleared and a fresh one is obtained before
 * replaying the original request.  403 responses are never retried.
 */
crmClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;
    if (!config) return Promise.reject(error);

    // Only handle CRM 401 responses.
    const entryPoint = getCrmEntryPoint(config);
    if (!entryPoint) return Promise.reject(error);
    if (error.response?.status !== 401) return Promise.reject(error);

    // Retry exactly once.
    if (config.__crmRetried) return Promise.reject(error);
    config.__crmRetried = true;

    clearCrmToken();
    const token = await getCrmToken();
    config.headers.Authorization = `Bearer ${token}`;

    return crmClient(config);
  },
);

/* ── fetch wrapper ──────────────────────────────────────────────────────── */

/**
 * Drop-in replacement for `fetch()` that adds the CRM Bearer token for
 * requests to kartikey.hrcrm.ai with an allowed entry point.
 *
 * Returns a standard `Response` object so callers can use `.json()`,
 * `.ok`, `.status`, abort signals, etc. exactly as before.
 *
 * @param {string} url
 * @param {RequestInit & { _crmRetried?: boolean }} [init]
 * @returns {Promise<Response>}
 */
export async function crmFetch(url, init = {}) {
  let parsed;
  try {
    parsed = new URL(url, window.location.origin);
  } catch {
    // Malformed URL — fall through to native fetch which will throw its own error.
    return fetch(url, init);
  }

  const entryPoint = parsed.searchParams.get("entryPoint");

  const isCrm =
    parsed.href.startsWith(CRM_URL_PREFIX) &&
    entryPoint &&
    ALLOWED_ENTRY_POINTS.has(entryPoint);

  if (!isCrm) return fetch(url, init);

  // Strip legacy email from sidebar requests.
  if (entryPoint === "sidebar") {
    parsed.searchParams.delete("email");
  }

  // Attach CRM Bearer token.
  const token = await getCrmToken();
  const headers = new Headers(init.headers || {});
  headers.set("Authorization", `Bearer ${token}`);

  const finalUrl = parsed.toString();
  const response = await fetch(finalUrl, { ...init, headers });

  // 401 retry — once, and only if not already retried or aborted.
  if (response.status === 401 && !init._crmRetried && !init.signal?.aborted) {
    clearCrmToken();
    return crmFetch(finalUrl, { ...init, _crmRetried: true });
  }

  return response;
}
