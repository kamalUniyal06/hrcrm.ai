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
import { store } from "../../../../store/store";

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

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const toApiDate = (date) => {
    return date ? format(date, "yyyy-MM-dd") : "";
};

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

    const [range, setRange] = useState({
        from: undefined,
        to: undefined,
    });

    const [error, setError] = useState("");

    const update = (key, value) => {
        setForm((current) => ({
            ...current,
            [key]: value,
        }));
    };

    /**
     * Handle leave proof selection
     */
    const chooseProof = (file) => {
        if (!file) return;

        // PDF validation
        if (
            file.type !== "application/pdf" &&
            !file.name.toLowerCase().endsWith(".pdf")
        ) {
            setError("Leave proof must be a PDF file.");

            if (fileInput.current) {
                fileInput.current.value = "";
            }

            return;
        }

        // 10 MB validation
        if (file.size > MAX_FILE_SIZE) {
            setError("PDF must be 10 MB or smaller.");

            if (fileInput.current) {
                fileInput.current.value = "";
            }

            return;
        }

        setError("");

        update("proof", file);
    };

    /**
     * Calculate number of leave days.
     *
     * Example:
     * 10 Sep -> 10 Sep = 1 day
     * 10 Sep -> 12 Sep = 3 days
     */
    const calculateLeaveDays = (from, to) => {
        if (!from || !to) return "";

        const fromDate = new Date(from);
        const toDate = new Date(to);

        // Remove time portion
        fromDate.setHours(0, 0, 0, 0);
        toDate.setHours(0, 0, 0, 0);

        const difference = toDate.getTime() - fromDate.getTime();

        return Math.floor(
            difference / (1000 * 60 * 60 * 24)
        ) + 1;
    };

    /**
     * Submit leave application
     */
    const submit = (event) => {
        event.preventDefault();

        // Leave type validation
        if (!form.type_of_leave) {
            return setError("Please select a leave type.");
        }

        // Other reason validation
        if (
            form.type_of_leave === "Other Reason" &&
            !form.other_reason.trim()
        ) {
            return setError("Please enter the reason for other leave.");
        }

        // Date validation
        if (!range.from || !range.to) {
            return setError("Please select a complete date range.");
        }

        // Final file-size validation
        // This protects against cases where the file was somehow
        // changed after the initial file selection.
        if (form.proof && form.proof.size > MAX_FILE_SIZE) {
            return setError("PDF must be 10 MB or smaller.");
        }

        setError("");

        const leaveFrom = toApiDate(range.from);
        const leaveTo = toApiDate(range.to);

        const leaveDays = calculateLeaveDays(
            range.from,
            range.to
        );

        const description =
            form.type_of_leave === "Other Reason"
                ? form.other_reason.trim()
                : form.note.trim();

        applyLeave({
            email: store.getState().user.user.email,
            candidate_id: store.getState().user.userInfo?.id,
            leave_type: form.type_of_leave,
            leave_from: leaveFrom,
            leave_to: leaveTo,
            leave_days: leaveDays,
            description,
            attachment: form.proof,
        });
    };

    const dateLabel = range.from
        ? range.to
            ? `${format(range.from, "dd MMM yyyy")} – ${format(
                range.to,
                "dd MMM yyyy"
            )}`
            : format(range.from, "dd MMM yyyy")
        : "Choose start and end date";

    return (
        <div className="apply-page">
            <button
                className="back-button"
                onClick={() => setView("overview")}
                type="button"
            >
                <ArrowLeft size={17} />
                Back to Leave
            </button>

            <div className="apply-shell">
                <form
                    className="apply-card"
                    onSubmit={submit}
                >
                    {/* Heading */}
                    <div className="apply-heading">
                        <span className="apply-icon">
                            <CalendarDays />
                        </span>

                        <div>
                            <span className="eyebrow">
                                NEW REQUEST
                            </span>

                            <h1>Apply for Leave</h1>

                            <p>
                                Tell us when you need time away.
                            </p>
                        </div>
                    </div>

                    {/* Leave Type */}
                    <div className="form-block">
                        <label>Type of Leave</label>

                        <Select
                            value={form.type_of_leave}
                            onValueChange={(value) => {
                                update(
                                    "type_of_leave",
                                    value
                                );

                                if (value !== "Other Reason") {
                                    update(
                                        "other_reason",
                                        ""
                                    );
                                }
                            }}
                        >
                            <SelectTrigger className="leave-select-trigger">
                                <SelectValue placeholder="Please Select" />
                            </SelectTrigger>

                            <SelectContent>
                                {leaveTypes.map((type) => (
                                    <SelectItem
                                        value={type}
                                        key={type}
                                    >
                                        {type}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Other Reason */}
                    {form.type_of_leave === "Other Reason" && (
                        <div className="form-block form-reveal">
                            <label htmlFor="other-reason">
                                Other Reason
                            </label>

                            <input
                                id="other-reason"
                                className="leave-input"
                                placeholder="Enter the reason for your leave"
                                value={form.other_reason}
                                onChange={(e) =>
                                    update(
                                        "other_reason",
                                        e.target.value
                                    )
                                }
                            />
                        </div>
                    )}

                    {/* Date Range */}
                    <div className="form-block">
                        <label>Date Range</label>

                        <Popover>
                            <PopoverTrigger asChild>
                                <button
                                    type="button"
                                    className={`calendar-trigger ${!range.from
                                        ? "calendar-trigger--placeholder"
                                        : ""
                                        }`}
                                >
                                    <CalendarDays size={17} />

                                    <span>
                                        {dateLabel}
                                    </span>
                                </button>
                            </PopoverTrigger>

                            <PopoverContent
                                align="start"
                                className="leave-calendar-popover"
                            >
                                <Calendar
                                    mode="range"
                                    selected={range}
                                    onSelect={(value) =>
                                        setRange(
                                            value || {
                                                from: undefined,
                                                to: undefined,
                                            }
                                        )
                                    }
                                    numberOfMonths={2}
                                    disabled={{
                                        before: new Date(),
                                    }}
                                    initialFocus
                                />
                            </PopoverContent>
                        </Popover>

                        {/* Show calculated days */}
                        {range.from && range.to && (
                            <small className="leave-days-info">
                                {calculateLeaveDays(
                                    range.from,
                                    range.to
                                )}{" "}
                                {calculateLeaveDays(
                                    range.from,
                                    range.to
                                ) === 1
                                    ? "day"
                                    : "days"}{" "}
                                selected
                            </small>
                        )}
                    </div>

                    {/* Leave Proof */}
                    <div className="form-block">
                        <label>
                            Leave Proof{" "}
                            <span className="optional-label">
                                (PDF, optional)
                            </span>
                        </label>

                        <input
                            ref={fileInput}
                            className="sr-only"
                            type="file"
                            accept="application/pdf,.pdf"
                            onChange={(e) =>
                                chooseProof(
                                    e.target.files?.[0]
                                )
                            }
                        />

                        {form.proof ? (
                            <div className="proof-file">
                                <FileText size={21} />

                                <div>
                                    <strong>
                                        {form.proof.name}
                                    </strong>

                                    <span>
                                        {(
                                            form.proof.size /
                                            1024 /
                                            1024
                                        ).toFixed(2)}{" "}
                                        MB
                                    </span>
                                </div>

                                <button
                                    type="button"
                                    aria-label="Remove PDF"
                                    onClick={() => {
                                        update(
                                            "proof",
                                            null
                                        );

                                        if (
                                            fileInput.current
                                        ) {
                                            fileInput.current.value =
                                                "";
                                        }
                                    }}
                                >
                                    <X size={17} />
                                </button>
                            </div>
                        ) : (
                            <button
                                type="button"
                                className="proof-upload"
                                onClick={() =>
                                    fileInput.current?.click()
                                }
                            >
                                <UploadCloud size={25} />

                                <span>
                                    <strong>
                                        Upload leave proof
                                    </strong>

                                    <small>
                                        PDF only, up to 10 MB
                                    </small>
                                </span>
                            </button>
                        )}
                    </div>

                    {/* Note */}
                    <div className="form-block">
                        <label htmlFor="leave-note">
                            Note to Management
                        </label>

                        <textarea
                            id="leave-note"
                            rows="5"
                            placeholder="Please enter any details that management should take into consideration."
                            value={form.note}
                            onChange={(e) =>
                                update(
                                    "note",
                                    e.target.value
                                )
                            }
                        />
                    </div>

                    {/* Error */}
                    {error && (
                        <p className="form-error">
                            {error}
                        </p>
                    )}

                    {/* Actions */}
                    <div className="form-actions">
                        <button
                            type="button"
                            disabled={isPending}
                            className="secondary-button"
                            onClick={() =>
                                setView("overview")
                            }
                        >
                            Cancel
                        </button>

                        <button
                            className="primary-button"
                            type="submit"
                            disabled={isPending}
                        >
                            {isPending
                                ? "Submitting..."
                                : "Submit Request"}
                        </button>
                    </div>
                </form>

                {/* Visual */}
                <aside className="apply-visual">
                    <img
                        src={leaveIllustration}
                        alt="Employee relaxing while on approved leave"
                    />

                    <div className="apply-visual__caption">
                        <span className="eyebrow">
                            MAKE TIME FOR YOURSELF
                        </span>

                        <h2>
                            Rest today. Return refreshed.
                        </h2>

                        <p>
                            Your time away matters. Submit
                            your request and keep your plans
                            in one place.
                        </p>
                    </div>
                </aside>
            </div>
        </div>
    );
}