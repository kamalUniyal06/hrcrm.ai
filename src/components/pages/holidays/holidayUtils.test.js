import test from "node:test";
import assert from "node:assert/strict";
import { formatHolidayDate, holidayDateKey, holidayListBody, holidayProblems, holidaySaveBody, holidayYears, sortHolidays, toHoliday } from "./holidayUtils.js";

test("reads holiday dates the gateway sends, and rejects ones that aren't real", () => {
  assert.equal(holidayDateKey("11/24/2026"), "2026-11-24");
  assert.equal(holidayDateKey("24/11/2026"), "2026-11-24");
  assert.equal(holidayDateKey("2026-12-25"), "2026-12-25");
  assert.equal(holidayDateKey("2026-12-25 00:00:00"), "2026-12-25");
  assert.equal(holidayDateKey("02/30/2026"), "");
  assert.equal(holidayDateKey(""), "");
  assert.equal(holidayDateKey("soon"), "");
});

test("turns a gateway record into a holiday", () => {
  assert.deepEqual(
    toHoliday({ id: "h1", name: "Prophet&#039;s Birthday", holiday_date: "08/26/2026", description: null }),
    { id: "h1", name: "Prophet's Birthday", date: "2026-08-26", description: "" },
  );
});

test("sorts by date with undated holidays last, and lists years newest first", () => {
  const holidays = [
    { id: "a", name: "Christmas", date: "2026-12-25" },
    { id: "b", name: "", date: "" },
    { id: "c", name: "Republic Day", date: "2026-01-26" },
    { id: "d", name: "New Year", date: "2027-01-01" },
  ];
  assert.deepEqual(sortHolidays(holidays).map((holiday) => holiday.id), ["c", "a", "d", "b"]);
  assert.deepEqual(holidayYears(holidays), ["2027", "2026"]);
});

test("asks for a name and a real date, and catches a duplicate", () => {
  assert.deepEqual(holidayProblems({ name: " ", date: "" }), { name: "Give the holiday a name.", date: "Choose the date." });
  const list = [{ id: "h1", name: "Diwali", date: "2026-11-08" }];
  assert.match(holidayProblems({ name: "diwali", date: "2026-11-08" }, list).date, /already/);
  // Editing the same holiday is not a duplicate of itself.
  assert.deepEqual(holidayProblems({ id: "h1", name: "Diwali", date: "2026-11-08" }, list), {});
});

test("builds gateway bodies", () => {
  assert.deepEqual(holidayListBody(2), { action: "fetch", module: "hrc_holidays", order_by: "holiday_date", order_dir: "ASC", page: 2, per_page: 100 });
  assert.deepEqual(holidaySaveBody({ name: " Diwali ", date: "2026-11-08", description: "" }), {
    action: "create", module: "hrc_holidays", data: { name: "Diwali", holiday_date: "2026-11-08", description: "" },
  });
  assert.deepEqual(holidaySaveBody({ id: "h1", name: "Diwali", date: "2026-11-09", description: "Moved" }), {
    action: "update", module: "hrc_holidays", id: "h1", data: { name: "Diwali", holiday_date: "2026-11-09", description: "Moved" },
  });
  assert.equal(formatHolidayDate("2026-12-25"), "Fri, 25 Dec 2026");
  assert.equal(formatHolidayDate(""), "");
});
