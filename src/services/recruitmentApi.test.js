import test from "node:test";
import assert from "node:assert/strict";
import { recruitmentRequest } from "./recruitmentApi.js";

test("recruitment requests isolate credentials and use candidate-specific query parameters", async (context) => {
  let call;
  context.mock.method(globalThis, "fetch", async (url, options) => {
    call = { url, options };
    return new Response(JSON.stringify({ success: true, invitations: [] }), { status: 200 });
  });
  await recruitmentRequest("/admin/invitations", { token: "recruitment-session", params: { external_reference: "candidate & one", status: "", page: 1 } });
  assert.equal(call.url.searchParams.get("external_reference"), "candidate & one");
  assert.equal(call.url.searchParams.has("status"), false);
  assert.equal(call.options.credentials, "omit");
  assert.deepEqual(call.options.headers, { Authorization: "Bearer recruitment-session" });
});

test("automatic session exchange sends the signed HRCRM token without login credentials", async (context) => {
  let call;
  context.mock.method(globalThis, "fetch", async (_url, options) => {
    call = options;
    return new Response(JSON.stringify({ success: true, access_token: "token" }), { status: 200 });
  });
  await recruitmentRequest("/integrations/hrcrm/session", { method: "POST", token: "signed-hrcrm-token" });
  assert.equal(call.headers.Authorization, "Bearer signed-hrcrm-token");
  assert.equal(call.body, undefined);
  assert.equal(call.credentials, "omit");
});

test("expired sessions retain an HTTP status for disconnect handling", async (context) => {
  context.mock.method(globalThis, "fetch", async () => new Response(JSON.stringify({ success: false, error: "Expired" }), { status: 401 }));
  await assert.rejects(recruitmentRequest("/admin/invitations", { token: "expired" }), (error) => error.status === 401 && /sign in to HRCRM/.test(error.message));
});

test("a valid session missing its candidate email reports a setup issue instead of asking for another login", async (context) => {
  const mocked = context.mock.method(globalThis, "fetch", async () => new Response(JSON.stringify({
    success: false, code: "HRCRM_CANDIDATE_EMAIL_REQUIRED",
    error: "Your HRCRM session has no verified candidate email. Sign in again or contact HR.",
  }), { status: 401 }));
  for (const status of [401, 503]) {
    mocked.mock.mockImplementation(async () => new Response(JSON.stringify({ success: false, code: "HRCRM_CANDIDATE_EMAIL_REQUIRED" }), { status }));
    await assert.rejects(recruitmentRequest("/integrations/hrcrm/my-invitation", { token: "valid-crm-token" }), (error) => {
      assert.equal(error.status, status);
      assert.equal(error.code, "HRCRM_CANDIDATE_EMAIL_REQUIRED");
      assert.match(error.message, /You are signed in/);
      assert.doesNotMatch(error.message, /sign in to HRCRM again/i);
      return true;
    });
  }
});

test("permission errors, malformed responses and network failures do not show success", async (context) => {
  const mocked = context.mock.method(globalThis, "fetch", async () => new Response(JSON.stringify({ success: false, error: "Recruiter access required" }), { status: 403 }));
  await assert.rejects(recruitmentRequest("/admin/invitations", { token: "viewer" }), /Recruiter access required/);
  mocked.mock.mockImplementation(async () => new Response("<html>Gateway error</html>", { status: 502 }));
  await assert.rejects(recruitmentRequest("/admin/invitations"), /502/);
  mocked.mock.mockImplementation(async () => { throw new TypeError("Failed to fetch"); });
  await assert.rejects(recruitmentRequest("/admin/invitations"), /Could not reach/);
});
