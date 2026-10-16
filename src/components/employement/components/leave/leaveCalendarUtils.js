// The holidays API returns MM/DD/YYYY, for example 11/24/2026.
export const parseHolidayDate = (value) => {
    const match = String(value || "").trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!match) return null;

    const [, monthValue, dayValue, yearValue] = match;
    const month = Number(monthValue);
    const day = Number(dayValue);
    const year = Number(yearValue);

    if (month < 1 || month > 12 || day < 1 || day > 31) return null;

    const date = new Date(year, month - 1, day);

    // Date normalizes invalid values (such as month 24) into another year.
    // Compare every part so invalid API dates are rejected instead.
    if (
        Number.isNaN(date.getTime()) ||
        date.getFullYear() !== year ||
        date.getMonth() !== month - 1 ||
        date.getDate() !== day
    ) {
        return null;
    }

    return date;
};

export const dateKey = (date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

/** Today's date in India, as a local midnight Date like the parsed holiday dates. */
export const todayInIndia = (now = new Date()) => {
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).formatToParts(now);
    const part = (type) => Number(parts.find((item) => item.type === type)?.value);
    return new Date(part("year"), part("month") - 1, part("day"));
};

const addDays = (date, days) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);

/**
 * This week and next, Monday first like the attendance calendar.
 * `holidays` are `{ date, name }` with local midnight dates.
 */
export function fortnightDays(today, holidays = []) {
    const names = new Map(holidays.map((holiday) => [dateKey(holiday.date), holiday.name]));
    const monday = addDays(today, -((today.getDay() + 6) % 7));
    const todayKey = dateKey(today);

    return Array.from({ length: 14 }, (_, index) => {
        const date = addDays(monday, index);
        const key = dateKey(date);
        return {
            key,
            date,
            isToday: key === todayKey,
            isPast: date < today,
            isWeekend: date.getDay() === 0 || date.getDay() === 6,
            holiday: names.get(key) ?? null,
        };
    });
}

/** The first holiday on or after today, with how many days away it is. */
export function nextHoliday(today, holidays = []) {
    const upcoming = holidays
        .filter((holiday) => holiday.date >= today)
        .sort((first, second) => first.date - second.date)[0];
    if (!upcoming) return null;
    return { ...upcoming, daysAway: Math.round((upcoming.date - today) / 86_400_000) };
}
