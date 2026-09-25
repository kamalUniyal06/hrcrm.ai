import { ChevronDown } from "lucide-react";

const history = [
    ["26", "Today", "11:19 AM", "- Still in office -", "6:27 hours", "yellow"],
    ["25", "25/9/23", "11:56 AM", "6:01 PM", "6:05 hours", "yellow"],
    ["24", "24/9/23", "10:11 AM", "8:53 PM", "10:42 hours", "green"],
    ["23", "23/9/23", "12:45 AM", "4:03 PM", "3:18 hours", "red"],
];

const statusColors = {
    green: "bg-green-500",
    yellow: "bg-yellow-500",
    red: "bg-red-500",
};

export default function WorkingHistory() {
    return (
        <section className="min-w-0 rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
            {/* Header */}
            <div className="flex items-center justify-between gap-3">
                <h2 className="text-base font-semibold text-foreground">
                    Working History
                </h2>

                <button
                    type="button"
                    className="inline-flex items-center gap-4 rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                >
                    Show all
                    <ChevronDown size={14} />
                </button>
            </div>

            {/* Legend */}
            <div className="mt-3 mb-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                    <i className="h-2 w-2 rounded-full bg-green-500" />
                    meeting criteria
                </span>

                <span className="inline-flex items-center gap-1.5">
                    <i className="h-2 w-2 rounded-full bg-yellow-500" />
                    criteria unmet
                </span>

                <span className="inline-flex items-center gap-1.5">
                    <i className="h-2 w-2 rounded-full bg-red-500" />
                    action needed
                </span>

                <span className="inline-flex items-center gap-1.5">
                    <i className="h-2 w-2 rounded-full bg-orange-500" />
                    overtime
                </span>
            </div>

            {/* Table */}
            <div className="w-full overflow-x-auto">
                <table className="w-full min-w-[570px] border-separate border-spacing-y-1 text-left">
                    <thead>
                        <tr>
                            <th className="rounded-l-lg bg-muted px-3 py-2.5 text-[10px] font-medium text-muted-foreground">
                                Date
                            </th>

                            <th className="bg-muted px-3 py-2.5 text-[10px] font-medium text-muted-foreground">
                                Arrival
                            </th>

                            <th className="bg-muted px-3 py-2.5 text-[10px] font-medium text-muted-foreground">
                                Departure
                            </th>

                            <th className="bg-muted px-3 py-2.5 text-[10px] font-medium text-muted-foreground">
                                Effective time
                            </th>

                            <th className="rounded-r-lg bg-muted px-3 py-2.5" />
                        </tr>
                    </thead>

                    <tbody>
                        {history.map((row) => (
                            <tr key={row[0]}>
                                {/* Date */}
                                <td className="border-b border-border px-3 py-2">
                                    <div className="flex items-center gap-2 whitespace-nowrap">
                                        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-muted text-xs text-muted-foreground">
                                            {row[0]}
                                        </span>

                                        <span
                                            className={
                                                row[1] === "Today"
                                                    ? "font-semibold text-primary"
                                                    : "text-foreground"
                                            }
                                        >
                                            {row[1]}
                                        </span>
                                    </div>
                                </td>

                                {/* Arrival */}
                                <td className="whitespace-nowrap border-b border-border px-3 py-2 text-xs text-foreground">
                                    {row[2]}
                                </td>

                                {/* Departure */}
                                <td className="whitespace-nowrap border-b border-border px-3 py-2 text-xs text-foreground">
                                    {row[3]}
                                </td>

                                {/* Effective time */}
                                <td className="border-b border-border px-3 py-2">
                                    <span className="block whitespace-nowrap text-xs text-foreground">
                                        {row[4]}
                                    </span>

                                    <span className="block text-[9px] text-muted-foreground">
                                        / 9 hours
                                    </span>
                                </td>

                                {/* Status ring */}
                                <td className="border-b border-border px-3 py-2">
                                    <span
                                        className={`relative block h-6 w-6 shrink-0 rounded-full ${statusColors[row[5]] ||
                                            "bg-muted"
                                            }`}
                                    >
                                        <span className="absolute inset-[3px] rounded-full bg-card" />
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </section>
    );
}