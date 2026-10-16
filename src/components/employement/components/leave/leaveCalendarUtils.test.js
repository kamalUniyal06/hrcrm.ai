import test from "node:test";
import assert from "node:assert/strict";
import { dateKey, fortnightDays, nextHoliday, parseHolidayDate, todayInIndia } from "./leaveCalendarUtils.js";

test("holiday dates are read as MM/DD/YYYY and invalid ones are rejected", () => {
    assert.equal(dateKey(parseHolidayDate("11/24/2026")), "2026-11-24");
    assert.equal(parseHolidayDate("24/11/2026"), null);
    assert.equal(parseHolidayDate("02/30/2026"), null);
    assert.equal(parseHolidayDate(""), null);
});

test("today follows the India calendar date", () => {
    // 20:00 UTC on 15 Oct is already 16 Oct in India.
    assert.equal(dateKey(todayInIndia(new Date("2026-10-15T20:00:00Z"))), "2026-10-16");
});

test("the fortnight starts on Monday and marks today, weekends and holidays", () => {
    const today = new Date(2026, 9, 16); // Friday
    const days = fortnightDays(today, [{ date: new Date(2026, 9, 20), name: "Diwali" }]);

    assert.equal(days.length, 14);
    assert.equal(days[0].key, "2026-10-12");
    assert.equal(days[13].key, "2026-10-25");
    assert.deepEqual(days.filter((day) => day.isToday).map((day) => day.key), ["2026-10-16"]);
    assert.deepEqual(days.filter((day) => day.isPast).map((day) => day.key), ["2026-10-12", "2026-10-13", "2026-10-14", "2026-10-15"]);
    assert.deepEqual(days.filter((day) => day.isWeekend).map((day) => day.key), ["2026-10-17", "2026-10-18", "2026-10-24", "2026-10-25"]);
    assert.equal(days.find((day) => day.key === "2026-10-20").holiday, "Diwali");
});

test("a Sunday belongs to the week that started the Monday before", () => {
    assert.equal(fortnightDays(new Date(2026, 9, 18))[0].key, "2026-10-12");
});

test("the next holiday is the earliest one from today, counted in days", () => {
    const today = new Date(2026, 9, 16);
    const holidays = [
        { date: new Date(2026, 11, 25), name: "Christmas" },
        { date: new Date(2026, 9, 2), name: "Gandhi Jayanti" },
        { date: new Date(2026, 10, 8), name: "Diwali" },
    ];

    assert.deepEqual(nextHoliday(today, holidays), { date: new Date(2026, 10, 8), name: "Diwali", daysAway: 23 });
    assert.equal(nextHoliday(new Date(2026, 9, 2), holidays).daysAway, 0);
    assert.equal(nextHoliday(new Date(2027, 0, 1), holidays), null);
});
