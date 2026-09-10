import { CalendarDays } from "lucide-react";
const holidays = [
    ["02 Oct, 2026", "Friday", "Gandhi Jayanti"],
    ["20 Oct, 2026", "Tuesday", "Dussehra"],
    ["08 Nov, 2026", "Sunday", "Diwali"],
    ["25 Dec, 2026", "Friday", "Christmas Day"],
    ["01 Jan, 2027", "Friday", "New Year's Day"],
];
export default function UpcomingHolidays() {
    return (
        <aside className="holiday-card">
            <div className="holiday-title">
                <CalendarDays size={19} />
                <div>
                    <span className="eyebrow">CALENDAR</span>
                    <h2>Upcoming Public Holidays</h2>
                </div>
            </div>
            <div>
                {holidays.map(([date, day, name]) => (
                    <div className="holiday-row" key={date}>
                        <div>
                            <strong>{date}</strong>
                            <span>{day}</span>
                        </div>
                        <b>{name}</b>
                    </div>
                ))}
            </div>
        </aside>
    );
}
