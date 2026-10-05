import { normalizeRecruitmentApiUrl } from "./recruitmentUtils.js";

export const recruitmentApiUrl = normalizeRecruitmentApiUrl(import.meta.env?.VITE_RECRUITMENT_API_URL || "https://recruitmentbackend.outrightsystems.org/api");

// Separate transport for the explicitly authorized HRCRM assessment integration.
export async function recruitmentRequest(path, { token, method = "GET", body, params, signal } = {}) {
  const url = new URL(`${recruitmentApiUrl}${path}`);
  for (const [key, value] of Object.entries(params || {})) {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, value);
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  const abort = () => controller.abort();
  signal?.addEventListener("abort", abort, { once: true });
  if (signal?.aborted) controller.abort();
  try {
    const response = await fetch(url, {
      method, credentials: "omit", signal: controller.signal,
      headers: { ...(body ? { "Content-Type": "application/json" } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok || data?.success !== true) {
      const error = new Error(response.status === 401 && token
        ? "Your assessment connection could not be authorized. Retry, or sign in to HRCRM again."
        : data?.error || data?.message || `Recruitment request failed (${response.status}). Please retry.`);
      error.status = response.status;
      error.code = data?.code;
      throw error;
    }
    return data;
  } catch (error) {
    if (error.name === "AbortError") throw new Error("The recruitment request was cancelled or timed out. Refresh its status before retrying.");
    if (error instanceof TypeError) throw new Error("Could not reach the recruitment service. Check your connection and the API's allowed origins.");
    throw error;
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", abort);
  }
}
