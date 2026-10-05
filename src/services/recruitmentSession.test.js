import test from "node:test";
import assert from "node:assert/strict";
import { createRecruitmentSession } from "./recruitmentSession.js";

const sessionResponse = { access_token: "assessment-only-token", expires_in: 300, user: { id: "crm-admin", role: "recruiter" } };

test("automatic connection exchanges the HRCRM token once for concurrent consumers", async () => {
  const calls = [];
  const manager = createRecruitmentSession({ getCrmToken: async () => "crm-token", clearCrmToken: () => {}, request: async (path, options) => { calls.push({ path, options }); return sessionResponse; } });
  const [first, second] = await Promise.all([manager.ensure(), manager.ensure()]);
  assert.deepEqual(first, second);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].path, "/integrations/hrcrm/session");
  assert.deepEqual(calls[0].options, { method: "POST", token: "crm-token" });
});

test("assessment requests use the limited token and reject general admin endpoints", async () => {
  const calls = [];
  const manager = createRecruitmentSession({ getCrmToken: async () => "crm-token", clearCrmToken: () => {}, request: async (path, options) => { calls.push({ path, options }); return path.endsWith("/session") ? sessionResponse : { success: true }; } });
  await manager.request("/invitations", { method: "POST", body: { external_reference: "candidate-1" } });
  assert.equal(calls[1].path, "/integrations/hrcrm/invitations");
  assert.equal(calls[1].options.token, "assessment-only-token");
  await assert.rejects(manager.request("/admin/assessment-settings"), /outside/);
});

test("expired HRCRM tokens refresh once, but permission and configuration errors never retry", async () => {
  let attempts = 0;
  let refreshes = 0;
  const manager = createRecruitmentSession({ getCrmToken: async () => "crm-token", clearCrmToken: () => { refreshes += 1; }, request: async () => {
    attempts += 1;
    if (attempts === 1) throw Object.assign(new Error("Expired"), { status: 401 });
    return sessionResponse;
  } });
  await manager.ensure();
  assert.equal(attempts, 2);
  assert.equal(refreshes, 1);
  for (const status of [403, 503]) {
    let deniedCalls = 0;
    const denied = createRecruitmentSession({ getCrmToken: async () => "crm-token", clearCrmToken: () => { throw new Error("Must not refresh"); }, request: async () => { deniedCalls += 1; throw Object.assign(new Error("Denied"), { status }); } });
    await assert.rejects(denied.ensure(), /Denied/);
    assert.equal(deniedCalls, 1);
  }
});

test("short-lived assessment tokens renew automatically and a rejected session retries once", async () => {
  let timestamp = 0;
  let exchanges = 0;
  let invitationCalls = 0;
  const manager = createRecruitmentSession({ now: () => timestamp, getCrmToken: async () => "crm-token", clearCrmToken: () => {}, request: async (path) => {
    if (path.endsWith("/session")) { exchanges += 1; return { ...sessionResponse, access_token: `token-${exchanges}` }; }
    invitationCalls += 1;
    if (invitationCalls === 1) throw Object.assign(new Error("Expired session"), { status: 401 });
    return { success: true };
  } });
  await manager.ensure();
  timestamp = 291000;
  await manager.ensure();
  assert.equal(exchanges, 2);
  await manager.request("/invitations");
  assert.equal(exchanges, 3);
  assert.equal(invitationCalls, 2);
});

test("account reset discards an in-flight token exchange", async () => {
  let finish;
  const manager = createRecruitmentSession({ getCrmToken: async () => "crm-token", clearCrmToken: () => {}, request: () => new Promise((resolve) => { finish = resolve; }) });
  const rejected = assert.rejects(manager.ensure(), /account changed/);
  await new Promise((resolve) => setImmediate(resolve));
  manager.reset();
  finish(sessionResponse);
  await rejected;
});
