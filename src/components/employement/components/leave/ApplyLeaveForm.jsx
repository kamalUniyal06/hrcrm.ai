import { useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import { gsap } from "gsap";
import he from "he";
import {
    ArrowLeft,
    ArrowRight,
    CalendarDays,
    Check,
    FileText,
    Info,
    Sparkles,
    UploadCloud,
    X,
} from "lucide-react";

import { Calendar, CalendarDayButton } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import leaveIllustration from "@/assets/employement/leave-application-illustration.png";
import { useLeave } from "../../context/LeaveContext";
import { usePublicHolidays } from "../../queries/leaves.queries";
import { store } from "../../../../store/store";

const leaveTypes = [
    "Half Day Sick Leave", "Sick Leave in Family", "Self Marriage",
    "Marriage in Immediate Family ( Same City )", "Marriage in Immediate Family ( Other City )",
    "Friends's Marriage ( Same City )", "Friends's Marriage ( Other City )", "BirthDay Leave",
    "Pet related emergency", "Train not coming on time", "worship in family", "Banking work",
    "Celebration in family", "Death of a relative", "Need to travel for hometown", "Short leave", "Other Reason",
];

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const toApiDate = (date) => date ? format(date, "yyyy-MM-dd") : "";
const dateKey = (date) => format(date, "yyyy-MM-dd");

const parseHolidayDate = (value) => {
    const match = String(value || "").trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!match) return null;

    const [, monthValue, dayValue, yearValue] = match;
    const date = new Date(Number(yearValue), Number(monthValue) - 1, Number(dayValue));
    return date.getFullYear() === Number(yearValue)
        && date.getMonth() === Number(monthValue) - 1
        && date.getDate() === Number(dayValue)
        ? date
        : null;
};

const calculateLeaveDays = (from, to, holidayKeys) => {
    if (!from || !to) return 0;
    const start = new Date(from);
    const end = new Date(to);
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    let days = 0;
    for (const date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
        const isWeekend = date.getDay() === 0 || date.getDay() === 6;
        if (!isWeekend && !holidayKeys.has(dateKey(date))) days += 1;
    }
    return days;
};

export default function ApplyLeaveForm() {
    const { applyLeave, setView, isPending } = useLeave();
    const pageRef = useRef(null);
    const fileInput = useRef(null);
    const [isDragging, setIsDragging] = useState(false);
    const [form, setForm] = useState({ type_of_leave: "", other_reason: "", note: "", proof: null });
    const [range, setRange] = useState({ from: undefined, to: undefined });
    const [error, setError] = useState("");
    const holidays = usePublicHolidays();

    const holidayEntries = useMemo(() => {
        const records = Array.isArray(holidays.data?.records) ? holidays.data.records : [];
        return records
            .map((record) => ({
                date: parseHolidayDate(record?.holiday_date),
                name: he.decode(String(record?.name || "Public holiday")),
            }))
            .filter((holiday) => holiday.date);
    }, [holidays.data]);
    const holidayDates = useMemo(() => holidayEntries.map((holiday) => holiday.date), [holidayEntries]);
    const holidayKeys = useMemo(() => new Set(holidayDates.map(dateKey)), [holidayDates]);
    const holidayNames = useMemo(
        () => new Map(holidayEntries.map((holiday) => [dateKey(holiday.date), holiday.name])),
        [holidayEntries],
    );

    const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
    const leaveDays = calculateLeaveDays(range.from, range.to, holidayKeys);
    const proofRequired = leaveDays > 3;

    useEffect(() => {
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;
        const context = gsap.context(() => {
            gsap.from("[data-form-reveal]", { y: 10, opacity: 0, duration: 0.35, stagger: 0.04, ease: "power2.out" });
        }, pageRef);
        return () => context.revert();
    }, []);

    const chooseProof = (file) => {
        if (!file) return;
        if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
            setError("Leave proof must be a PDF file.");
            if (fileInput.current) fileInput.current.value = "";
            return;
        }
        if (file.size > MAX_FILE_SIZE) {
            setError("PDF must be 10 MB or smaller.");
            if (fileInput.current) fileInput.current.value = "";
            return;
        }
        setError("");
        update("proof", file);
    };

    const submit = (event) => {
        event.preventDefault();
        if (!form.type_of_leave) return setError("Please select a leave type.");
        if (form.type_of_leave === "Other Reason" && !form.other_reason.trim()) return setError("Please enter the reason for other leave.");
        if (!range.from || !range.to) return setError("Please select a complete date range.");
        if (holidays.isPending) return setError("Please wait while public holidays are loaded.");
        if (holidays.isError) return setError("Public holidays could not be checked. Please try again.");
        if (proofRequired && !form.proof) return setError("A supporting document is required for leave longer than 3 working days.");
        if (form.proof && form.proof.size > MAX_FILE_SIZE) return setError("PDF must be 10 MB or smaller.");

        setError("");
        applyLeave({
            email: store.getState().user.user.email,
            candidate_id: store.getState().user.userInfo?.id,
            leave_type: form.type_of_leave,
            leave_from: toApiDate(range.from),
            leave_to: toApiDate(range.to),
            leave_days: leaveDays,
            description: form.type_of_leave === "Other Reason" ? form.other_reason.trim() : form.note.trim(),
            attachment: form.proof,
        });
    };

    const completedSteps = [Boolean(form.type_of_leave), Boolean(range.from && range.to), Boolean(form.note.trim() || form.other_reason.trim())];
    const completion = Math.round((completedSteps.filter(Boolean).length / completedSteps.length) * 100);
    const dateLabel = range.from
        ? range.to ? `${format(range.from, "dd MMM yyyy")} - ${format(range.to, "dd MMM yyyy")}` : format(range.from, "dd MMM yyyy")
        : "Choose start and end date";
    const fieldClass = "mt-2 w-full rounded-2xl border border-border bg-[var(--leave-page)] px-4 py-3 text-sm text-[var(--leave-text)] outline-none transition placeholder:text-[var(--leave-muted)] focus:border-primary focus:ring-4 focus:ring-primary/10";

    return (
        <div ref={pageRef} className="relative isolate min-h-screen overflow-hidden bg-[var(--leave-page)] px-3 py-4 text-[var(--leave-text)] sm:px-5 sm:py-6 lg:px-7">
            <div className="pointer-events-none absolute -right-24 top-20 -z-10 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
            <div className="pointer-events-none absolute -left-24 bottom-20 -z-10 h-72 w-72 rounded-full bg-[var(--leave-green)]/15 blur-3xl" />

            <div className="mx-auto w-full max-w-[1450px]">
                <button type="button" onClick={() => setView("overview")} className="mb-4 inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-[var(--leave-muted)] transition hover:bg-[var(--leave-surface)] hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                    <ArrowLeft size={17} /> Back to leave workspace
                </button>

                <div className="grid overflow-hidden rounded-[2rem] border border-border bg-[var(--leave-surface)] shadow-2xl shadow-primary/10 xl:grid-cols-[minmax(0,1.2fr)_minmax(340px,0.8fr)]">
                    <form onSubmit={submit} className="min-w-0 p-5 sm:p-8 lg:p-10">
                        <div data-form-reveal className="flex flex-col gap-5 border-b border-border pb-7 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                                <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-primary">
                                    <Sparkles size={14} /> New request
                                </div>
                                <h1 className="text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">Plan your time away</h1>
                                <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--leave-muted)]">A few thoughtful details are all we need. You can review everything before submitting.</p>
                            </div>
                            <div className="shrink-0 rounded-2xl bg-[var(--leave-page)] px-4 py-3">
                                <div className="flex items-center justify-between gap-5 text-xs font-semibold"><span>Request readiness</span><span className="text-primary">{completion}%</span></div>
                                <div className="mt-2 h-1.5 w-36 overflow-hidden rounded-full bg-[var(--leave-track)]"><div className="h-full rounded-full bg-primary transition-[width] duration-500" style={{ width: `${completion}%` }} /></div>
                            </div>
                        </div>

                        <div className="mt-7 grid gap-6 lg:grid-cols-2">
                            <div data-form-reveal className="lg:col-span-2">
                                <label className="text-sm font-semibold" htmlFor="leave-type">What kind of leave do you need?</label>
                                <p className="mt-1 text-xs text-[var(--leave-muted)]">Choose the option that best matches your request.</p>
                                <Select value={form.type_of_leave} onValueChange={(value) => { update("type_of_leave", value); if (value !== "Other Reason") update("other_reason", ""); }}>
                                    <SelectTrigger id="leave-type" className={`${fieldClass} h-12`}><SelectValue placeholder="Select a leave type" /></SelectTrigger>
                                    <SelectContent>{leaveTypes.map((type) => <SelectItem value={type} key={type}>{type}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>

                            {form.type_of_leave === "Other Reason" && (
                                <div data-form-reveal className="lg:col-span-2">
                                    <label htmlFor="other-reason" className="text-sm font-semibold">Tell us the reason</label>
                                    <input id="other-reason" className={fieldClass} placeholder="A short, clear reason" value={form.other_reason} onChange={(event) => update("other_reason", event.target.value)} />
                                </div>
                            )}

                            <div data-form-reveal>
                                <label className="text-sm font-semibold">When will you be away?</label>
                                <p className="mt-1 text-xs text-[var(--leave-muted)]">Select the first and last day.</p>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <button type="button" className={`${fieldClass} flex min-h-12 items-center justify-between gap-3 text-left ${range.from ? "text-[var(--leave-text)]" : "text-[var(--leave-muted)]"}`}>
                                            <span className="flex min-w-0 items-center gap-3"><CalendarDays size={18} className="shrink-0 text-primary" /><span className="truncate">{dateLabel}</span></span>
                                            {leaveDays > 0 && <span className="shrink-0 rounded-lg bg-primary/10 px-2 py-1 text-xs font-bold text-primary">{leaveDays} {leaveDays === 1 ? "day" : "days"}</span>}
                                        </button>
                                    </PopoverTrigger>
                                    <PopoverContent align="start" className="w-auto max-w-[calc(100vw-2rem)] overflow-auto rounded-2xl border-border p-2">
                                        <Calendar
                                            mode="range"
                                            selected={range}
                                            onSelect={(value) => setRange(value || { from: undefined, to: undefined })}
                                            numberOfMonths={1}
                                            disabled={[
                                                { before: new Date() },
                                                { dayOfWeek: [0, 6] },
                                                ...holidayDates,
                                            ]}
                                            modifiers={{ weekend: { dayOfWeek: [0, 6] }, publicHoliday: holidayDates }}
                                            modifiersClassNames={{
                                                weekend: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
                                                publicHoliday: "!bg-emerald-100 !text-emerald-900 !opacity-100 font-bold ring-1 ring-inset ring-emerald-400 dark:!bg-emerald-900 dark:!text-emerald-100",
                                            }}
                                            components={{
                                                DayButton: (props) => {
                                                    const holidayName = holidayNames.get(dateKey(props.day.date));
                                                    if (!holidayName) return <CalendarDayButton {...props} />;

                                                    return (
                                                        <div className="group/holiday relative flex h-full w-full items-center justify-center">
                                                            <CalendarDayButton
                                                                {...props}
                                                                aria-label={`${props.day.date.toLocaleDateString()}: ${holidayName}`}
                                                                className="!text-emerald-900 !opacity-100 dark:!text-emerald-100"
                                                            />
                                                            <span role="tooltip" className="pointer-events-none absolute bottom-[calc(100%+0.45rem)] left-1/2 z-50 w-max max-w-52 -translate-x-1/2 rounded-lg bg-[var(--leave-text)] px-2.5 py-1.5 text-center text-xs font-medium leading-4 text-[var(--leave-surface)] opacity-0 shadow-lg transition-opacity group-hover/holiday:opacity-100">
                                                                {holidayName}
                                                                <span className="absolute left-1/2 top-full h-2 w-2 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-[var(--leave-text)]" />
                                                            </span>
                                                        </div>
                                                    );
                                                },
                                            }}
                                            initialFocus
                                        />
                                        <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-border px-2 pt-2 text-[11px] text-[var(--leave-muted)]">
                                            <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-amber-200" />Saturday / Sunday</span>
                                            <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-emerald-200 ring-1 ring-emerald-300" />Public holiday</span>
                                        </div>
                                    </PopoverContent>
                                </Popover>
                            </div>

                            <div data-form-reveal>
                                <label className="text-sm font-semibold">Supporting document <span className={`font-normal ${proofRequired ? "text-destructive" : "text-[var(--leave-muted)]"}`}>{proofRequired ? "(required)" : "(optional)"}</span></label>
                                <p className="mt-1 text-xs text-[var(--leave-muted)]">{proofRequired ? "Required for more than 3 working days. " : ""}PDF format, up to 10 MB.</p>
                                <input ref={fileInput} className="sr-only" type="file" accept="application/pdf,.pdf" onChange={(event) => chooseProof(event.target.files?.[0])} />
                                {form.proof ? (
                                    <div className="mt-2 flex min-h-12 items-center gap-3 rounded-2xl border border-[var(--leave-green)]/35 bg-[var(--leave-green-soft)] px-4 py-3">
                                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[var(--leave-green)] text-primary-foreground"><FileText size={18} /></span>
                                        <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{form.proof.name}</p><p className="text-xs text-[var(--leave-muted)]">{(form.proof.size / 1024 / 1024).toFixed(2)} MB · Ready</p></div>
                                        <button type="button" aria-label="Remove PDF" onClick={() => { update("proof", null); if (fileInput.current) fileInput.current.value = ""; }} className="rounded-lg p-2 text-[var(--leave-muted)] transition hover:bg-[var(--leave-surface)] hover:text-destructive"><X size={17} /></button>
                                    </div>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => fileInput.current?.click()}
                                        onDragOver={(event) => { event.preventDefault(); setIsDragging(true); }}
                                        onDragLeave={() => setIsDragging(false)}
                                        onDrop={(event) => { event.preventDefault(); setIsDragging(false); chooseProof(event.dataTransfer.files?.[0]); }}
                                        className={`mt-2 flex min-h-12 w-full items-center gap-3 rounded-2xl border border-dashed px-4 py-3 text-left transition ${isDragging ? "border-primary bg-primary/10" : "border-border bg-[var(--leave-page)] hover:border-primary/50 hover:bg-primary/5"}`}
                                    >
                                        <UploadCloud size={20} className="shrink-0 text-primary" /><span className="text-sm font-semibold">Drop PDF here <span className="font-normal text-[var(--leave-muted)]">or browse</span></span>
                                    </button>
                                )}
                            </div>

                            <div data-form-reveal className="lg:col-span-2">
                                <div className="flex items-center justify-between gap-3"><label htmlFor="leave-note" className="text-sm font-semibold">A note for your manager</label><span className="text-xs text-[var(--leave-muted)]">{form.note.length}/500</span></div>
                                <textarea id="leave-note" rows="5" maxLength="500" className={`${fieldClass} resize-none`} placeholder="Add context that will help your manager review this request..." value={form.note} onChange={(event) => update("note", event.target.value)} />
                            </div>
                        </div>

                        {error && <div role="alert" className="mt-5 flex items-start gap-2 rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive"><Info size={18} className="mt-0.5 shrink-0" />{error}</div>}

                        <div data-form-reveal className="mt-7 flex flex-col-reverse gap-3 border-t border-border pt-6 sm:flex-row sm:justify-end">
                            <button type="button" disabled={isPending} onClick={() => setView("overview")} className="rounded-2xl border border-border px-5 py-3 text-sm font-semibold transition hover:bg-[var(--leave-page)] disabled:opacity-50">Cancel</button>
                            <button type="submit" disabled={isPending || holidays.isPending} className="group inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20 transition hover:-translate-y-0.5 hover:shadow-xl disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50">
                                {isPending ? "Submitting request..." : holidays.isPending ? "Checking holidays..." : "Submit leave request"}<ArrowRight size={17} className="transition-transform group-hover:translate-x-1" />
                            </button>
                        </div>
                    </form>

                    <aside
                        className="relative hidden min-h-full overflow-hidden bg-cover bg-center p-8 text-white xl:flex xl:flex-col xl:justify-between lg:p-10"
                        style={{ backgroundImage: `url(${leaveIllustration})` }}
                    >
                        <div className="absolute inset-0 bg-[var(--sidebar-primary)]/55" />
                        <div className="absolute inset-0 bg-gradient-to-b from-black/5 via-black/15 to-black/45" />
                        <div className="relative">
                            <span className="inline-flex items-center gap-2 rounded-full border border-primary-foreground/20 bg-primary-foreground/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em]"><CalendarDays size={14} /> Request preview</span>
                            <h2 className="mt-6 max-w-sm text-4xl font-semibold leading-tight tracking-[-0.04em]">Your next reset starts here.</h2>
                            <p className="mt-4 max-w-sm text-sm leading-6 text-white/85">Take the time you need. A clear request makes approval simple for everyone.</p>
                        </div>

                        <div className="relative my-10 rounded-2xl border border-white/20 bg-black/45 p-6 shadow-xl backdrop-blur-sm">
                            <div className="flex items-center justify-between"><span className="text-xs font-bold uppercase tracking-[0.14em] text-white/70">Time away</span><span className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--leave-green)] text-white"><CalendarDays size={19} /></span></div>
                            <p className="mt-8 text-3xl font-semibold">{leaveDays || "-"} <span className="text-base font-normal text-white/70">{leaveDays === 1 ? "day" : "days"}</span></p>
                            <p className="mt-2 text-sm text-white/80">{range.from ? dateLabel : "Your selected dates will appear here"}</p>
                            <div className="mt-6 border-t border-white/20 pt-5"><p className="text-xs text-white/65">Leave type</p><p className="mt-1 font-semibold">{form.type_of_leave || "Not selected yet"}</p></div>
                        </div>

                        <div className="relative space-y-3">
                            {["Choose your leave type", "Select your dates", "Add helpful context"].map((step, index) => (
                                <div key={step} className="flex items-center gap-3 text-sm"><span className={`grid h-7 w-7 place-items-center rounded-full border ${completedSteps[index] ? "border-[var(--leave-green)] bg-[var(--leave-green)]" : "border-primary-foreground/25 bg-primary-foreground/10"}`}>{completedSteps[index] ? <Check size={15} /> : index + 1}</span><span className={completedSteps[index] ? "text-primary-foreground" : "text-primary-foreground/65"}>{step}</span></div>
                            ))}
                        </div>
                    </aside>
                </div>
            </div>
        </div>
    );
}
