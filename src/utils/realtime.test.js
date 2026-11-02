import test from "node:test";
import assert from "node:assert/strict";
import { isEventForMe, parseRealtimeEvent, realtimeRefreshKeys, realtimeSettings } from "./realtime.js";

const config = {
  enabled: true,
  socket_url: "https://socket.guestpostcrm.com",
  transport: "socket.io",
  listen_event: "new-mail",
  user_id: "emp-1",
  broadcast_user_id: "all",
  crm: "Kartikey.hrcrm.ai",
};

const data = (overrides = {}) => ({
  name: "notification",
  user_id: "emp-1",
  message: "Manager leave token received",
  chat_id: "n1",
  msg_type: "notification.new",
  details: { crm: "kartikey.hrcrm.ai", notification_id: "n1", redirect_to: "/my-leaves", copy_item: "K7Q2MZ" },
  ...overrides,
});

test("reads realtime_config and refuses a disabled or unconfigured socket", () => {
  assert.deepEqual(realtimeSettings(config), {
    url: "https://socket.guestpostcrm.com",
    event: "new-mail",
    userId: "emp-1",
    broadcast: "all",
    crm: "kartikey.hrcrm.ai",
  });
  assert.equal(realtimeSettings({ ...config, listen_event: "" }).event, "activity");
  assert.equal(realtimeSettings({ ...config, enabled: false }), null);
  assert.equal(realtimeSettings({ ...config, socket_url: "" }), null);
  assert.equal(realtimeSettings(undefined), null);
});

test("unwraps socket messages in every shape the server may forward", () => {
  const event = parseRealtimeEvent(data());
  assert.equal(event.type, "notification.new");
  assert.equal(event.userId, "emp-1");
  assert.equal(event.details.copy_item, "K7Q2MZ");
  assert.equal(parseRealtimeEvent({ event: "activity", data: data() }).chatId, "n1");
  assert.equal(parseRealtimeEvent(JSON.stringify(data())).message, "Manager leave token received");
  assert.deepEqual(parseRealtimeEvent(data({ details: null })).details, {});
  assert.equal(parseRealtimeEvent("not json"), null);
  assert.equal(parseRealtimeEvent({ subject: "a GuestPostCRM mail" }), null);
});

test("keeps only events from this CRM for me or everyone", () => {
  const settings = realtimeSettings(config);
  assert.equal(isEventForMe(parseRealtimeEvent(data()), settings), true);
  assert.equal(isEventForMe(parseRealtimeEvent(data({ user_id: "all" })), settings), true);
  assert.equal(isEventForMe(parseRealtimeEvent(data({ user_id: "emp-2" })), settings), false);
  assert.equal(isEventForMe(parseRealtimeEvent(data({ details: { crm: "other.hrcrm.ai" } })), settings), false);
  // GuestPostCRM mail events on the shared channel carry no CRM host.
  assert.equal(isEventForMe(parseRealtimeEvent(data({ details: {} })), settings), false);
  // Without an employee id (a CRM admin session) only broadcasts count.
  const admin = realtimeSettings({ ...config, user_id: "" });
  assert.equal(isEventForMe(parseRealtimeEvent(data({ user_id: "" })), admin), false);
  assert.equal(isEventForMe(parseRealtimeEvent(data({ user_id: "all" })), admin), true);
});

test("refreshes the lists each event touches", () => {
  const keys = (overrides) => realtimeRefreshKeys(parseRealtimeEvent(data(overrides))).map((key) => key.join("/"));
  assert.deepEqual(keys({ details: { crm: "kartikey.hrcrm.ai" } }), ["hr/notification-counts", "hr/notifications"]);
  // A notification also refreshes the screen it opens: an issued leave code shows up on My leave.
  assert.ok(keys().includes("hr/leave-tokens"));
  assert.ok(keys({ details: { redirect_to: "/leave-approvals?id=t1" } }).includes("hr/leave-tokens"));
  assert.ok(keys({ details: { redirect_to: "/org/chart" } }).includes("hr/org-tree"));
  assert.ok(!keys({ details: { redirect_to: "/my-leaves-old" } }).includes("hr/leave-tokens"));
  assert.deepEqual(keys({ msg_type: "notification.seen" }), ["hr/notification-counts", "hr/notifications"]);
  assert.deepEqual(keys({ msg_type: "alert.new" }), ["system-alerts"]);
  assert.ok(keys({ msg_type: "record.saved", details: { module: "hrc_leaves" } }).includes("leaves"));
  assert.ok(keys({ msg_type: "record.deleted", details: { module: "hrc_leave_tokens" } }).includes("hr/leave-tokens"));
  // Unknown modules still refresh their dynamic CRM views.
  assert.deepEqual(keys({ msg_type: "record.saved", details: { module: "Accounts" } }), ["entity/Accounts"]);
  assert.deepEqual(keys({ msg_type: "record.saved", details: {} }), []);
  assert.ok(keys({ msg_type: "org.changed" }).includes("hr/org-tree"));
  assert.ok(keys({ msg_type: "org.changed" }).includes("hr/me"));
  assert.ok(keys({ msg_type: "employee.terminated" }).includes("hr/people"));
  assert.deepEqual(keys({ msg_type: "access.changed" }), ["hr/me", "sidebar"]);
  assert.deepEqual(keys({ msg_type: "test.ping" }), []);
  assert.deepEqual(realtimeRefreshKeys(null), []);
});
