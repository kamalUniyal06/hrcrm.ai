import { MoreVertical } from "lucide-react";
import { useLeave } from "../../context/LeaveContext";
const pretty = (value) =>
    new Intl.DateTimeFormat("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    }).format(new Date(`${value}T00:00:00`));
export default function LeaveHistory() {
    const { history } = useLeave();
    return (
        <section className="leave-history">
            <div className="leave-section__heading">
                <div>
                    <span className="eyebrow">REQUESTS</span>
                    <h2>Leave History</h2>
                </div>
                <span>{history.length} requests</span>
            </div>
            <div className="leave-table-wrap">
                <table className="leave-table">
                    <thead>
                        <tr>
                            <th>Leave Type</th>
                            <th>Start Date to End Date</th>
                            <th>Duration</th>
                            <th>Status</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {history.map((row) => (
                            <tr key={row.id}>
                                <td>
                                    <strong>{row.type}</strong>
                                </td>
                                <td>
                                    {pretty(row.start)} — {pretty(row.end)}
                                </td>
                                <td>
                                    {row.duration} {row.duration === 1 ? "Day" : "Days"}
                                </td>
                                <td>
                                    <span
                                        className={`leave-status leave-status--${row.status.toLowerCase()}`}
                                    >
                                        ● {row.status}
                                    </span>
                                </td>
                                <td>
                                    <button className="icon-plain" aria-label="More actions">
                                        <MoreVertical size={17} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </section>
    );
}
