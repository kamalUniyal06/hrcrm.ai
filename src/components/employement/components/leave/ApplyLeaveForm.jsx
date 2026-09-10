import {
    ArrowLeft,
    CalendarDays,
    FileText,
    UploadCloud,
    X,
} from "lucide-react";
import { format } from "date-fns";
import { useRef, useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import leaveIllustration from "@/assets/employement/leave-application-illustration.png";
import { useLeave } from "../../context/LeaveContext";

const leaveTypes = [
    "Half Day Sick Leave",
    "Sick Leave in Family",
    "Self Marriage",
    "Marriage in Immediate Family ( Same City )",
    "Marriage in Immediate Family ( Other City )",
    "Friends's Marriage ( Same City )",
    "Friends's Marriage ( Other City )",
    "BirthDay Leave",
    "Pet related emergency",
    "Train not coming on time",
    "worship in family",
    "Banking work",
    "Celebration in family",
    "Death of a relative",
    "Need to travel for hometown",
    "Short leave",
    "Other Reason",
];
const toApiDate = (date) => (date ? format(date, "yyyy-MM-dd") : "");

export default function ApplyLeaveForm() {
    const { applyLeave, setView, isPending } = useLeave();
    const fileInput = useRef(null);
    const [form, setForm] = useState({
        leave_from: "",
        leave_to: "",
        type_of_leave: "",
        other_reason: "",
        note: "",
        proof: null,
    });
    const [range, setRange] = useState({ from: undefined, to: undefined });
    const [error, setError] = useState("");
    const update = (key, value) =>
        setForm((current) => ({ ...current, [key]: value }));
    const chooseProof = (file) => {
        if (!file) return;
        if (file.type !== "application/pdf")
            return setError("Leave proof must be a PDF file.");
        if (file.size > 10 * 1024 * 1024)
            return setError("PDF must be smaller than 10 MB.");
        setError("");
        update("proof", file);
    };
    const submit = (event) => {
        event.preventDefault();
        if (!form.type_of_leave) return setError("Please select a leave type.");
        if (form.type_of_leave === "Other Reason" && !form.other_reason.trim())
            return setError("Please enter the reason for other leave.");
        if (!range.from || !range.to)
            return setError("Please select a complete date range.");
        setError("");
        applyLeave({
            ...form,
            leave_from: toApiDate(range.from),
            leave_to: toApiDate(range.to),
            proof_name: form.proof?.name || "",
        });
    };
    const dateLabel = range.from
        ? range.to
            ? `${format(range.from, "dd MMM yyyy")} – ${format(range.to, "dd MMM yyyy")}`
            : format(range.from, "dd MMM yyyy")
        : "Choose start and end date";

    return (
        <div className="apply-page">
            <button className="back-button" onClick={() => setView("overview")}>
                <ArrowLeft size={17} /> Back to Leave
            </button>
            <div className="apply-shell">
                <form className="apply-card" onSubmit={submit}>
                    <div className="apply-heading">
                        <span className="apply-icon">
                            <CalendarDays />
                        </span>
                        <div>
                            <span className="eyebrow">NEW REQUEST</span>
                            <h1>Apply for Leave</h1>
                            <p>Tell us when you need time away.</p>
                        </div>
                    </div>
                    <div className="form-block">
                        <label>Type of Leave</label>
                        <Select
                            value={form.type_of_leave}
                            onValueChange={(value) => {
                                update("type_of_leave", value);
                                if (value !== "Other Reason") update("other_reason", "");
                            }}
                        >
                            <SelectTrigger className="leave-select-trigger">
                                <SelectValue placeholder="Please Select" />
                            </SelectTrigger>
                            <SelectContent>
                                {leaveTypes.map((type) => (
                                    <SelectItem value={type} key={type}>
                                        {type}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    {form.type_of_leave === "Other Reason" && (
                        <div className="form-block form-reveal">
                            <label htmlFor="other-reason">Other Reason</label>
                            <input
                                id="other-reason"
                                className="leave-input"
                                placeholder="Enter the reason for your leave"
                                value={form.other_reason}
                                onChange={(e) => update("other_reason", e.target.value)}
                            />
                        </div>
                    )}
                    <div className="form-block">
                        <label>Date Range</label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <button
                                    type="button"
                                    className={`calendar-trigger ${!range.from ? "calendar-trigger--placeholder" : ""}`}
                                >
                                    <CalendarDays size={17} />
                                    <span>{dateLabel}</span>
                                </button>
                            </PopoverTrigger>
                            <PopoverContent align="start" className="leave-calendar-popover">
                                <Calendar
                                    mode="range"
                                    selected={range}
                                    onSelect={(value) =>
                                        setRange(value || { from: undefined, to: undefined })
                                    }
                                    numberOfMonths={2}
                                    disabled={{ before: new Date() }}
                                    initialFocus
                                />
                            </PopoverContent>
                        </Popover>
                    </div>
                    <div className="form-block">
                        <label>
                            Leave Proof{" "}
                            <span className="optional-label">(PDF, optional)</span>
                        </label>
                        <input
                            ref={fileInput}
                            className="sr-only"
                            type="file"
                            accept="application/pdf,.pdf"
                            onChange={(e) => chooseProof(e.target.files?.[0])}
                        />
                        {form.proof ? (
                            <div className="proof-file">
                                <FileText size={21} />
                                <div>
                                    <strong>{form.proof.name}</strong>
                                    <span>{(form.proof.size / 1024 / 1024).toFixed(2)} MB</span>
                                </div>
                                <button
                                    type="button"
                                    aria-label="Remove PDF"
                                    onClick={() => {
                                        update("proof", null);
                                        if (fileInput.current) fileInput.current.value = "";
                                    }}
                                >
                                    <X size={17} />
                                </button>
                            </div>
                        ) : (
                            <button
                                type="button"
                                className="proof-upload"
                                onClick={() => fileInput.current?.click()}
                            >
                                <UploadCloud size={25} />
                                <span>
                                    <strong>Upload leave proof</strong>
                                    <small>PDF only, up to 10 MB</small>
                                </span>
                            </button>
                        )}
                    </div>
                    <div className="form-block">
                        <label htmlFor="leave-note">Note to Management</label>
                        <textarea
                            id="leave-note"
                            rows="5"
                            placeholder="Please enter any details that management should take into consideration."
                            value={form.note}
                            onChange={(e) => update("note", e.target.value)}
                        />
                    </div>
                    {error && <p className="form-error">{error}</p>}
                    <div className="form-actions">
                        <button
                            type="button"
                            disabled={isPending}
                            className="secondary-button"
                            onClick={() => setView("overview")}
                        >
                            Cancel
                        </button>
                        <button className="primary-button" type="submit" disabled={isPending}>
                            {isPending ? "Submitting..." : "Submit Request"}
                        </button>
                    </div>
                </form>
                <aside className="apply-visual">
                    <img
                        src={leaveIllustration}
                        alt="Employee relaxing while on approved leave"
                    />
                    <div className="apply-visual__caption">
                        <span className="eyebrow">MAKE TIME FOR YOURSELF</span>
                        <h2>Rest today. Return refreshed.</h2>
                        <p>
                            Your time away matters. Submit your request and keep your plans in
                            one place.
                        </p>
                    </div>
                </aside>
            </div>
        </div>
    );
}
