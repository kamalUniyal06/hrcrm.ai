import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { createRequire } from "node:module";
import { transformSync } from "esbuild";

const require = createRequire(import.meta.url);
const source = transformSync(fs.readFileSync(new URL("./userSlice.js", import.meta.url), "utf8"), {
  loader: "js", format: "cjs",
}).code;

// Exercise the real thunk and reducer without browser storage or live auth calls.
function authHarness(apiRequest, authenticated = false) {
  const module = { exports: {} };
  const mocks = {
    "../constants": { AUTH_URL: "https://app.hrcrm.ai/public/index.php" },
    "../../services/api": { apiRequest },
    "../../services/crmAuth": { clearCrmToken() {} },
    "../../components/employement/api/systemAlerts.api": { ensureSystemAlertsAnswered() {} },
  };
  vm.runInNewContext(source, {
    module, exports: module.exports,
    require: (name) => {
      if (name === "@reduxjs/toolkit") return require(name);
      if (Object.hasOwn(mocks, name)) return mocks[name];
      throw new Error(`Unexpected dependency: ${name}`);
    },
    localStorage: { setItem() {} },
    console: { log() {} },
  });
  const { default: reducer, getUser, userAction } = module.exports;
  let state = reducer(undefined, { type: "@@init" });
  const actions = [];
  const dispatch = (action) => { actions.push(action); state = reducer(state, action); };
  if (authenticated) dispatch(userAction.loadUserSuccess({ user: { email: "test@example.com" }, userInfo: { id: "subject-id" } }));
  return {
    check: () => getUser()(dispatch, () => ({ user: state })),
    state: () => state,
    actions,
  };
}

test("initial auth 401s show the signed-out state with a null failure payload", async () => {
  for (const error of ["Invalid token", "Unauthorized user", "email missing", "Token and email both missing", ""]) {
    const auth = authHarness(async () => { throw { response: { status: 401, data: { error } } }; });
    await auth.check();
    assert.equal(auth.state().isAuthenticated, false);
    assert.equal(auth.state().loading, false);
    assert.equal(auth.state().error, null);
    assert.equal(auth.actions.at(-1).type, "user/loadUserFailed");
    assert.equal(auth.actions.at(-1).payload, null);
  }
});

test("a 401 during an authenticated session retains the session-expired message", async () => {
  const auth = authHarness(async () => { throw { response: { status: 401, data: { error: "Invalid token" } } }; }, true);
  await auth.check();
  assert.equal(auth.state().isAuthenticated, false);
  assert.equal(auth.state().loading, false);
  assert.equal(auth.state().error, "Your session expired. Please login again.");
});

test("server and network failures remain visible on the initial auth check", async () => {
  for (const [failure, message] of [
    [{ response: { status: 500, data: {} } }, "Server error. Please try again later."],
    [{ response: { status: 503, data: {} } }, "Unable to verify your account. Please try again later."],
    [{ response: { status: 403, data: { error: "Access denied" } } }, "Access denied"],
    [{ request: {} }, "Network error. Please check your internet connection."],
    [new Error("Unexpected failure"), "Something went wrong. Please try again."],
  ]) {
    const auth = authHarness(async () => { throw failure; });
    await auth.check();
    assert.equal(auth.state().error, message);
    assert.equal(auth.state().isAuthenticated, false);
    assert.equal(auth.state().loading, false);
  }
});

test("successful auth still stores the subject type and clears errors", async () => {
  const auth = authHarness(async () => ({ user: { email: "test@example.com" }, id: "candidate-id", subject_type: "candidate" }));
  await auth.check();
  assert.equal(auth.state().isAuthenticated, true);
  assert.equal(auth.state().userInfo.subject_type, "candidate");
  assert.equal(auth.state().error, null);
});
