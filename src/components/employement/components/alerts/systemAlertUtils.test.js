import test from "node:test";
import assert from "node:assert/strict";
import {
  alertBadges,
  alertExpiresAt,
  alertFormFromRecord,
  alertPayload,
  answerButtonLabel,
  answerLabel,
  countAnswers,
  diffTargets,
  employeeOptions,
  isAlertExpired,
  isAlertLive,
  markAlertAnswered,
  parseUtc,
  popupQueue,
  readAlertStatus,
  readMyAlerts,
  respondErrorKind,
  toUtcStamp,
  utcToLocalStamp,
  validateAlertForm,
} from "./systemAlertUtils.js";

const myAlert = (extra) => ({
  id: "a1", name: "Dussehra timing", description: "<p>Hi</p>", date_entered: "2026-10-21 03:40:12",
  response_type: "yes_no", answer: null, responded: false, blocks_logout: true, allowed_answers: ["yes", "no"], ...extra,
});

test("reads my_alerts and works out the pending and blocking counts", () => {
  const data = readMyAlerts({
    success: true,
    alerts: [
      myAlert(),
      myAlert({ id: "a2", response_type: "none", blocks_logout: false, allowed_answers: ["seen"] }),
      myAlert({ id: "a3", response_type: "acknowledge", responded: true, answer: "acknowledged", blocks_logout: false }),
      { name: "No id" },
    ],
    pending_count: 99,
  });
  assert.deepEqual(data.alerts.map((alert) => alert.id), ["a1", "a2", "a3"]);
  assert.equal(data.pendingCount, 2);
  assert.equal(data.blockingCount, 1);
});

test("fills in answers and logout blocking from the response type when missing", () => {
  const [ack, info, unknown] = readMyAlerts({ alerts: [
    { id: "x", response_type: "acknowledge" },
    { id: "y", response_type: "none" },
    { id: "z", response_type: "mystery" },
  ] }).alerts;
  assert.deepEqual(ack.allowed_answers, ["acknowledged"]);
  assert.equal(ack.blocks_logout, true);
  assert.equal(info.blocks_logout, false);
  assert.equal(unknown.response_type, "yes_no");
});

test("marking an alert answered stops it blocking logout", () => {
  const data = markAlertAnswered(readMyAlerts({ alerts: [myAlert()] }), "a1", "Yes", new Date(Date.UTC(2026, 9, 22, 4, 5, 6)));
  assert.equal(data.alerts[0].answer, "yes");
  assert.equal(data.alerts[0].answered_at, "2026-10-22 04:05:06");
  assert.equal(data.pendingCount, 0);
  assert.equal(data.blockingCount, 0);
});

test("the popup queue holds unanswered alerts, oldest first", () => {
  const { alerts } = readMyAlerts({ alerts: [
    myAlert({ id: "new", date_entered: "2026-10-22 09:00:00" }),
    myAlert({ id: "old", date_entered: "2026-10-20 09:00:00" }),
    myAlert({ id: "info", response_type: "none", blocks_logout: false, date_entered: "2026-10-21 09:00:00" }),
    myAlert({ id: "done", responded: true, answer: "no" }),
  ] });
  assert.deepEqual(popupQueue(alerts).map((alert) => alert.id), ["old", "info", "new"]);
  assert.deepEqual(popupQueue(alerts, { snoozed: new Set(["old"]) }).map((alert) => alert.id), ["info", "new"]);
  assert.deepEqual(popupQueue(alerts, { blockingOnly: true }).map((alert) => alert.id), ["old", "new"]);
});

test("UTC timestamps are read as UTC", () => {
  assert.equal(parseUtc("2026-10-21 03:40:12").toISOString(), "2026-10-21T03:40:12.000Z");
  assert.equal(parseUtc("not a date"), null);
  const local = new Date(Date.UTC(2026, 9, 21, 3, 40, 12));
  const expected = `${local.getFullYear()}-${String(local.getMonth() + 1).padStart(2, "0")}-${String(local.getDate()).padStart(2, "0")} ${String(local.getHours()).padStart(2, "0")}:${String(local.getMinutes()).padStart(2, "0")}`;
  assert.equal(utcToLocalStamp("2026-10-21 03:40:12"), expected);
});

test("labels answers and buttons for every response type", () => {
  assert.equal(answerLabel("acknowledged"), "Acknowledged");
  assert.equal(answerLabel("SEEN"), "Seen");
  assert.equal(answerButtonLabel("seen"), "Close");
  assert.equal(answerButtonLabel("acknowledged"), "I have read this");
  assert.equal(answerButtonLabel("maybe"), "Maybe");
});

test("classifies alert_respond errors the UI treats differently", () => {
  assert.equal(respondErrorKind(new Error("You have already responded to this alert.")), "duplicate");
  assert.equal(respondErrorKind(new Error("This alert is not available to you.")), "unavailable");
  assert.equal(respondErrorKind(new Error("Network Error")), "other");
});

const at = (year, month, day, hour = 0, minute = 0) => new Date(year, month - 1, day, hour, minute);

test("an alert is live while active and not past its expiry time", () => {
  const noon = at(2026, 10, 22, 12);
  assert.equal(isAlertLive({ active: "1", expires_on: "" }, noon), true);
  assert.equal(isAlertLive({}, noon), true);
  assert.equal(isAlertLive({ active: "0" }, noon), false);
  assert.equal(isAlertLive({ deleted: "1" }, noon), false);
  // A date alone lasts until the end of that day.
  assert.equal(isAlertLive({ active: "1", expires_on: "2026-10-22" }, noon), true);
  assert.equal(isAlertLive({ active: "1", expires_on: "10/21/2026" }, noon), false);
  // A gateway time is local; an hrc timestamp is UTC.
  assert.equal(isAlertLive({ expires_on: "10/22/2026 11:30" }, noon), false);
  assert.equal(isAlertLive({ expires_on: "10/22/2026 15:00" }, noon), true);
  assert.equal(isAlertExpired({ expires_on: toUtcStamp(at(2026, 10, 22, 11, 59)) }, noon), true);
  assert.equal(isAlertExpired({ expires_on: toUtcStamp(at(2026, 10, 22, 12, 1)) }, noon), false);
});

test("reads expiry dates in either day order", () => {
  assert.deepEqual(alertExpiresAt({ expires_on: "23/10/2026" }), new Date(2026, 9, 23, 23, 59, 59));
  assert.deepEqual(alertExpiresAt({ expires_on: "10/23/2026" }), new Date(2026, 9, 23, 23, 59, 59));
  assert.equal(alertExpiresAt({ expires_on: "" }), null);
});

test("badges show status, audience, response type and expiry", () => {
  const now = at(2026, 10, 22, 9);
  assert.deepEqual(alertBadges({ audience: "selected", response_type: "none", active: "1", expires_on: "2026-10-31" }, now).map((badge) => badge.label),
    ["Live", "Selected employees", "Information only", "Until 31 Oct 2026"]);
  assert.match(alertBadges({ active: "1", expires_on: "10/22/2026 17:30" }, now)[3].label, /^Until 22 Oct 2026, 5:30\s?pm$/i);
  assert.equal(alertBadges({ active: "1", expires_on: "2026-10-01" }, now)[0].label, "Expired");
  assert.equal(alertBadges({ active: "0" }, now)[0].label, "Inactive");
});

test("my_alerts drops alerts whose expiry time has passed", () => {
  const data = readMyAlerts({ alerts: [myAlert(), myAlert({ id: "gone", expires_on: toUtcStamp(at(2026, 10, 22, 8)) })] }, at(2026, 10, 22, 9));
  assert.deepEqual(data.alerts.map((alert) => alert.id), ["a1"]);
  assert.equal(data.blockingCount, 1);
});

test("reads alert_status and falls back to list lengths", () => {
  const status = readAlertStatus({
    target_count: 3, responded_count: "1", answer_counts: { yes: 1 },
    responded: [{ id: "e1", name: "Swati", email: "swati@x.com", answer: "YES", answered_at: "2026-10-22 03:56:19" }],
    pending: [{ id: "e2", email: "b@x.com" }],
  });
  assert.equal(status.targetCount, 3);
  assert.equal(status.respondedCount, 1);
  assert.equal(status.pendingCount, 1);
  assert.equal(status.responded[0].answer, "yes");
  assert.equal(status.pending[0].name, "b@x.com");
  assert.deepEqual(countAnswers([{ description: "Yes" }, { description: "yes" }, { description: "seen" }, {}]), { yes: 2, seen: 1 });
});

test("works out which employee links to add and remove", () => {
  assert.deepEqual(diffTargets(["a", "b", " "], ["b", "c", "c"]), { add: ["c"], remove: ["a"] });
});

test("the employee picker hides deleted and former employees", () => {
  const options = employeeOptions([
    { id: "2", first_name: "Zoya", email1: "ZOYA@x.com" },
    { id: "1", name: "Aman", email1: "aman@x.com" },
    { id: "3", name: "Gone", deleted: "1" },
    { id: "4", name: "Left", stage_id_name: "Ex Employee", hrc_phase_id_name: "Exit" },
  ]);
  assert.deepEqual(options, [
    { id: "1", name: "Aman", email: "aman@x.com" },
    { id: "2", name: "Zoya", email: "zoya@x.com" },
  ]);
});

test("validates the HR alert form", () => {
  const now = at(2026, 10, 22, 12);
  const valid = { name: "PAN", description: "<p>Upload</p>", audience: "all", employeeIds: [], responseType: "acknowledge", expiresOn: "", expiresTime: "" };
  assert.deepEqual(validateAlertForm(valid, now), {});
  const errors = validateAlertForm({ ...valid, name: " ", description: "<p> </p>", audience: "selected", responseType: "maybe", expiresOn: "2026-10-21" }, now);
  assert.deepEqual(Object.keys(errors).sort(), ["description", "employees", "expiresOn", "name", "responseType"]);
  assert.deepEqual(validateAlertForm({ ...valid, description: "<img src='x.png'>" }, now), {});
  // Same-day expiry works as long as the time is still ahead.
  assert.deepEqual(validateAlertForm({ ...valid, expiresOn: "2026-10-22", expiresTime: "17:00" }, now), {});
  assert.equal(validateAlertForm({ ...valid, expiresOn: "2026-10-22", expiresTime: "11:00" }, now).expiresOn, "Pick a time later than now.");
  assert.ok(validateAlertForm({ ...valid, expiresTime: "11:00" }, now).expiresOn);
});

test("turns form values into alert fields and back", () => {
  const payload = alertPayload({ name: " PAN ", description: "<p>Upload</p>", audience: "selected", responseType: "acknowledge", active: false, expiresOn: "2026-10-31", expiresTime: "15:30" });
  assert.deepEqual(payload, { name: "PAN", description: "<p>Upload</p>", audience: "selected", response_type: "acknowledge", active: 0, expires_on: toUtcStamp(at(2026, 10, 31, 15, 30)) });
  assert.equal(alertPayload({ expiresOn: "2026-10-31", expiresTime: "" }).expires_on, toUtcStamp(new Date(2026, 9, 31, 23, 59, 59)));
  assert.equal(alertPayload({ expiresOn: "" }).expires_on, "");
  const form = alertFormFromRecord({ name: "Office &amp; team", description: "&lt;p&gt;Hi&lt;/p&gt;", audience: "selected", response_type: "none", active: "1", expires_on: "10/31/2026" }, ["e1"]);
  assert.deepEqual(form, { name: "Office & team", description: "<p>Hi</p>", audience: "selected", employeeIds: ["e1"], responseType: "none", active: true, expiresOn: "2026-10-31", expiresTime: "" });
  const timed = alertFormFromRecord({ expires_on: toUtcStamp(at(2026, 10, 22, 17, 5)) });
  assert.equal(timed.expiresOn, "2026-10-22");
  assert.equal(timed.expiresTime, "17:05");
});
