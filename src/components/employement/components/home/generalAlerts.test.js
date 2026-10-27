import test from "node:test";
import assert from "node:assert/strict";
import { generalAlerts, hideAlert, hiddenAlertsKey, indiaMinutes, isWorkingDay, readHiddenAlerts } from "./generalAlerts.js";

const missing = [{ key: "employee:1", name: "Asha" }, { key: "employee:2", name: "Ravi" }];

test("the no-check-in alert starts at 11:00 AM on working days only", () => {
  const base = { day: "2026-10-27", notCheckedIn: missing };
  assert.deepEqual(generalAlerts({ ...base, minutes: 10 * 60 + 59 }), []);
  const [alert] = generalAlerts({ ...base, minutes: 11 * 60 });
  assert.equal(alert.id, "2026-10-27:no-check-in");
  assert.equal(alert.title, "2 employees not checked in by 11:00 AM");
  assert.equal(alert.people, missing);
  assert.deepEqual(generalAlerts({ ...base, minutes: 12 * 60, workingDay: false }), []);
  assert.deepEqual(generalAlerts({ ...base, minutes: 12 * 60, notCheckedIn: [] }), []);
});

test("waiting leave and overdue quotations show any time, most urgent first", () => {
  const alerts = generalAlerts({
    day: "2026-10-27",
    minutes: 9 * 60,
    waitingLeaves: [{ key: "leave:1", name: "Asha" }],
    overdueQuotations: [{ key: "q:1", name: "Wiring" }, { key: "q:2", name: "Painting" }],
  });
  assert.deepEqual(alerts.map((alert) => alert.title), ["1 leave request waiting 2+ days for a decision", "2 quotations unpaid for over 7 days"]);
  const withMissing = generalAlerts({ day: "2026-10-27", minutes: 11 * 60, notCheckedIn: missing, waitingLeaves: [{ key: "leave:1", name: "Asha" }] });
  assert.deepEqual(withMissing.map((alert) => alert.tone), ["danger", "warning"]);
});

test("working days skip weekends and holidays; India time", () => {
  assert.equal(isWorkingDay("2026-10-27"), true);
  assert.equal(isWorkingDay("2026-10-25"), false);
  assert.equal(isWorkingDay("2026-10-31"), false);
  assert.equal(isWorkingDay("2026-10-27", new Set(["2026-10-27"])), false);
  assert.equal(indiaMinutes(new Date("2026-10-27T05:30:00Z")), 11 * 60);
});

test("a hidden alert stays hidden for that day only", () => {
  const data = {};
  const storage = { getItem: (key) => data[key] ?? null, setItem: (key, value) => { data[key] = value; } };
  hideAlert(storage, "admin-1", "2026-10-27", "2026-10-27:no-check-in");
  assert.deepEqual([...readHiddenAlerts(storage, "admin-1", "2026-10-27")], ["2026-10-27:no-check-in"]);
  assert.equal(readHiddenAlerts(storage, "admin-1", "2026-10-28").size, 0);
  assert.equal(readHiddenAlerts(storage, "admin-2", "2026-10-27").size, 0);
  hideAlert(storage, "admin-1", "2026-10-28", "2026-10-28:leave-waiting");
  assert.deepEqual(JSON.parse(data[hiddenAlertsKey("admin-1")]), { day: "2026-10-28", ids: ["2026-10-28:leave-waiting"] });
  data[hiddenAlertsKey("admin-1")] = "not json";
  assert.equal(readHiddenAlerts(storage, "admin-1", "2026-10-28").size, 0);
});
