import test from "node:test";
import assert from "node:assert/strict";
import { createCandidateTestLoader, loadCandidateTestInvitation } from "./candidateTestData.js";

const candidate = { id: "crm-one", email1: "candidate@example.com" };
const options = { candidate, email: "candidate@example.com" };
const now = Date.parse("2026-10-06T12:00:00Z");
const invitation = { id: 12, status: "pending", external_reference: candidate.id, intended_email: candidate.email1, expires_at: "2026-10-12T12:00:00Z" };
const active = { success: true, invitation, invitation_url: "https://assessment.example/invite/personal-token" };

test("the candidate test read requests only their verified reference and returns the generated link", async () => {
  let params;
  const data = await loadCandidateTestInvitation(async (value) => { params = value; return active; }, options, now);
  assert.deepEqual(params, { external_reference: candidate.id });
  assert.deepEqual(data, { status: "pending", url: active.invitation_url, expiresAt: invitation.expires_at });
});

test("unverified profiles never make a test request", async () => {
  for (const identity of [undefined, {}, { candidate, email: "other@example.com" }, { candidate: { email1: candidate.email1 }, email: candidate.email1 }]) {
    await assert.rejects(loadCandidateTestInvitation(async () => assert.fail("No request permitted"), identity, now), /verified/);
  }
});

test("invitation responses for a different profile or email cannot become an open-test link", async () => {
  for (const mismatch of [{ external_reference: "crm-other" }, { intended_email: "other@example.com" }]) {
    await assert.rejects(loadCandidateTestInvitation(async () => ({ ...active, invitation: { ...invitation, ...mismatch } }), options, now), /did not match your profile/);
  }
});

test("no invitation, old hashed links and inactive invitations have distinct states without a URL", async () => {
  assert.deepEqual(await loadCandidateTestInvitation(async () => ({ success: true, invitation: null }), options, now), { status: "not_created", url: "", expiresAt: "" });
  for (const status of ["expired", "accepted", "revoked"]) {
    const data = await loadCandidateTestInvitation(async () => ({ ...active, invitation: { ...invitation, status } }), options, now);
    assert.equal(data.status, status);
    assert.equal(data.url, "");
  }
  const old = await loadCandidateTestInvitation(async () => ({ ...active, invitation: { ...invitation, link_unavailable: true }, invitation_url: null }), options, now);
  assert.equal(old.status, "unavailable");
  assert.equal(old.url, "");
  const expired = await loadCandidateTestInvitation(async () => active, options, Date.parse("2026-10-13T12:00:00Z"));
  assert.equal(expired.status, "expired");
  assert.equal(expired.url, "");
});

test("invalid URLs, malformed responses and failure envelopes surface errors", async () => {
  for (const invitation_url of ["javascript:alert(1)", "http://untrusted.example/test", "https://user:password@assessment.example/test", "invalid"]) {
    await assert.rejects(loadCandidateTestInvitation(async () => ({ ...active, invitation_url }), options, now), /test link could not be loaded/);
  }
  for (const body of [{ success: false, error: "Denied" }, { success: true }, { ...active, invitation: { ...invitation, status: "unknown" } }, { ...active, invitation: { ...invitation, expires_at: "invalid" } }]) {
    await assert.rejects(loadCandidateTestInvitation(async () => body, options, now));
  }
});

test("candidate test reads use the CRM token directly and refresh once on 401", async () => {
  const calls = [];
  let clears = 0;
  const load = createCandidateTestLoader({
    getToken: async () => clears ? "fresh-crm-token" : "expired-crm-token",
    clearToken: () => { clears += 1; },
    request: async (path, request) => {
      calls.push({ path, request });
      if (calls.length === 1) throw Object.assign(new Error("Expired"), { status: 401 });
      return { ...active, invitation: { ...invitation, expires_at: new Date(Date.now() + 86400000).toISOString() } };
    },
  });
  const result = await load(options);
  assert.equal(result.url, active.invitation_url);
  assert.equal(clears, 1);
  assert.ok(calls.every((call) => call.path === "/integrations/hrcrm/my-invitation"));
  assert.deepEqual(calls.map((call) => call.request.token), ["expired-crm-token", "fresh-crm-token"]);
  assert.deepEqual(calls[0].request.params, { external_reference: candidate.id });
});

test("permission errors, aborts and a second 401 are never retried indefinitely", async () => {
  for (const [status, signal, expectedCalls] of [[403, undefined, 1], [401, { aborted: true }, 1], [401, undefined, 2]]) {
    let calls = 0;
    const load = createCandidateTestLoader({ getToken: async () => "token", clearToken: () => {}, request: async () => { calls += 1; throw Object.assign(new Error("Denied"), { status }); } });
    await assert.rejects(load({ ...options, signal }), /Denied/);
    assert.equal(calls, expectedCalls);
  }
});

test("a missing signed email on a valid token never triggers a token refresh or automatic replay", async () => {
  let calls = 0;
  const load = createCandidateTestLoader({
    getToken: async () => "valid-crm-token",
    clearToken: () => assert.fail("Refreshing cannot add a missing issuer claim"),
    request: async () => {
      calls += 1;
      throw Object.assign(new Error("Test-link access needs an authentication update"), { status: 401, code: "HRCRM_CANDIDATE_EMAIL_REQUIRED" });
    },
  });
  await assert.rejects(load(options), (error) => error.code === "HRCRM_CANDIDATE_EMAIL_REQUIRED");
  assert.equal(calls, 1);
});

test("an explicit retry obtains a fresh CRM token after the issuer email claim is fixed", async () => {
  let calls = 0;
  let clears = 0;
  const tokens = [];
  const load = createCandidateTestLoader({
    getToken: async () => clears ? "token-with-email" : "token-without-email",
    clearToken: () => { clears += 1; },
    request: async (_path, request) => {
      calls += 1;
      tokens.push(request.token);
      if (calls === 1) throw Object.assign(new Error("Missing claim"), { status: 503, code: "HRCRM_CANDIDATE_EMAIL_REQUIRED" });
      return { ...active, invitation: { ...invitation, expires_at: new Date(Date.now() + 86400000).toISOString() } };
    },
  });
  await assert.rejects(load(options), (error) => error.code === "HRCRM_CANDIDATE_EMAIL_REQUIRED");
  assert.equal(calls, 1);
  assert.equal(clears, 0);
  assert.equal((await load(options)).url, active.invitation_url);
  assert.equal(clears, 1);
  assert.deepEqual(tokens, ["token-without-email", "token-with-email"]);
});
