import { CheckSquare2 } from "lucide-react";

const rows = [
    ["green", "1,031", "on time"],
    ["yellow", "191", "Work from home"],
    ["red", "212", "late attendance"],
    ["gray", "66", "absent"],
];

const statusColors = {
    green: "bg-green-500",
    yellow: "bg-yellow-500",
    red: "bg-red-500",
    gray: "bg-muted-foreground",
};

export default function AttendanceSummary() {
    return (
        <section className="min-w-0 rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
            {/* Header */}
            <div className="flex items-center justify-between gap-3">
                <h2 className="text-base font-semibold text-foreground">
                    My Attendance
                </h2>

                <button
                    type="button"
                    className="border-0 bg-transparent text-xs font-semibold text-primary transition-colors hover:text-primary/80 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                >
                    View Stats
                </button>
            </div>

            {/* Divider */}
            <div className="my-4 h-px w-full bg-border" />

            {/* Content */}
            <div className="grid grid-cols-[minmax(0,1fr)_120px] items-center gap-4 sm:grid-cols-[minmax(0,1fr)_130px]">
                {/* Legend */}
                <div className="grid gap-4">
                    {rows.map(([color, count, label]) => (
                        <div
                            key={label}
                            className="flex items-center gap-2 text-xs text-muted-foreground"
                        >
                            <span
                                className={`h-2 w-2 shrink-0 rounded-full ${statusColors[color] ||
                                    "bg-muted-foreground"
                                    }`}
                            />

                            <span>
                                <strong className="font-semibold text-foreground">
                                    {count}
                                </strong>{" "}
                                {label}
                            </span>
                        </div>
                    ))}
                </div>

                {/* Donut */}
                <div
                    className="relative grid h-[120px] w-[120px] place-items-center rounded-full sm:h-[130px] sm:w-[130px]"
                    style={{
                        background:
                            "conic-gradient(var(--color-green-500) 0 72%, var(--color-yellow-500) 72% 82%, var(--color-red-500) 82% 90%, var(--muted) 90%)",
                    }}
                >
                    <div className="grid h-[91px] w-[91px] place-content-center rounded-full bg-card text-center sm:h-[98px] sm:w-[98px]">
                        <strong className="text-xl font-semibold leading-none text-foreground">
                            1,434
                        </strong>

                        <span className="mt-1 text-[10px] text-muted-foreground">
                            /1500
                        </span>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="mt-6 flex items-center gap-2 text-xs text-muted-foreground">
                <CheckSquare2
                    size={18}
                    className="shrink-0 text-green-500"
                />

                <span>
                    Better than{" "}
                    <strong className="font-semibold text-foreground">
                        91.3%
                    </strong>{" "}
                    employees!
                </span>
            </div>
        </section>
    );
}