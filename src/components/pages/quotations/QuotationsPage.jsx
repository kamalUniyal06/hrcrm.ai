import { useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { useSearchParams } from "react-router-dom";
import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { ArrowLeft, CalendarRange, CheckCheck, ChevronDown, FileText, Pencil, Plus, ReceiptText, RefreshCw, Search, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";
import { selectIsAdmin } from "@/utils/pageAccess";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { pageGutter } from "../../employement/components/home/homeUi";
import {
  useAcknowledgeQuotation,
  useDeleteQuotation,
  useQuotationAcknowledgements,
  useQuotationAdmins,
  useQuotations,
  useSaveQuotation,
} from "../../../queries/quotations.queries";
import QuotationDrawer, { QuotationForm } from "./QuotationForm";
import QuotationInvoice from "./QuotationInvoice";
import { acknowledgementsByQuotation, awaitingAcknowledgement, needsAcknowledgement } from "./quotationAcknowledgements";
import { TIME_PERIODS, amountOf, daysOutstanding, filterQuotations, formatAmount, formatDay, isPaid, periodRange, quotationDate, quotationPeople, quotationSummary } from "./quotationUtils";

const STATUS_TABS = [["all", "All"], ["unpaid", "Not paid"], ["paid", "Paid"]];
const iconButton = "grid size-9 place-items-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function StatusBadge({ paid }) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold",
      paid ? "bg-[var(--attendance-present)]/10 text-[var(--attendance-present)]" : "bg-[var(--attendance-absent)]/10 text-[var(--attendance-absent)]",
    )}>
      <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
      {paid ? "Paid" : "Not paid"}
    </span>
  );
}

// A custom range left open on one side uses 0000-01-01 / 9999-12-31 (see periodRange).
const openEnd = (key, label) => (/^(?:0000|9999)-/.test(key) ? label : formatDay(key));
const dateInput ="rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";

/** Time filter for the ledger: preset periods, or a custom range of work dates. */
function PeriodBar({ period, from, to, range, onChange }) {
  return (
    <section aria-label="Time period" data-tour="quotation-period" className="flex flex-col gap-3 rounded-2xl bg-card p-3 shadow-sm ring-1 ring-border/70 lg:flex-row lg:items-center">
      <span className="flex shrink-0 items-center gap-2 px-1 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        <CalendarRange size={15} aria-hidden="true" /> Period
      </span>
      <div role="radiogroup" aria-label="Period" className="hide-scrollbar flex gap-1 overflow-x-auto">
        {TIME_PERIODS.map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={period === id}
            onClick={() => onChange({ period: id === "all" ? null : id, from: id === "custom" ? from : null, to: id === "custom" ? to : null })}
            className={cn(
              "shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              period === id ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>
      {period === "custom" && (
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
            From <input type="date" value={from} max={to || undefined} onChange={(event) => onChange({ from: event.target.value })} className={dateInput} />
          </label>
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
            To <input type="date" value={to} min={from || undefined} onChange={(event) => onChange({ to: event.target.value })} className={dateInput} />
          </label>
        </div>
      )}
      <p className="text-xs text-muted-foreground lg:ml-auto">
        {range ? `Work dated ${openEnd(range.from, "the start")} – ${openEnd(range.to, "now")}` : "Showing every quotation"}
      </p>
    </section>
  );
}

/** A small button that opens who acknowledged the quotation, who it is waiting on, and the viewer's own Acknowledge action. */
function AcknowledgedCell({ acks = [], awaiting = [], mine, pending, onAcknowledge }) {
  return (
    <Popover>
      <PopoverTrigger
        className={cn(
          "inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          mine ? "border-[var(--attendance-late)]/40 bg-[var(--attendance-late)]/10 text-[var(--attendance-late)]" : "border-border text-foreground hover:bg-muted",
        )}
      >
        <CheckCheck size={13} aria-hidden="true" />
        {mine ? "Acknowledge" : `${acks.length} acknowledged`}
        <ChevronDown size={13} aria-hidden="true" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 gap-0 p-0">
        <div className="max-h-72 overflow-y-auto p-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Acknowledged by</p>
          {acks.length ? (
            <ul className="mt-1.5 space-y-1">
              {acks.map((ack) => (
                <li key={ack.employeeId} className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate text-foreground">{ack.name || "Unknown admin"}</span>
                  {ack.at && <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">{formatDay(ack.at.slice(0, 10))}</span>}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1.5 text-sm text-muted-foreground">No one yet.</p>
          )}
          {awaiting.length > 0 && (
            <>
              <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Waiting on</p>
              <ul className="mt-1.5 space-y-1">
                {awaiting.map((admin) => <li key={admin.id} className="truncate text-sm text-muted-foreground">{admin.name}</li>)}
              </ul>
            </>
          )}
        </div>
        {mine && (
          <div className="border-t border-border p-2">
            <button type="button" onClick={onAcknowledge} disabled={pending} className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-[var(--attendance-late)] px-3 py-2 text-xs font-semibold text-white transition hover:opacity-90 disabled:opacity-60">
              <CheckCheck size={14} aria-hidden="true" /> {pending ? "Saving…" : "Acknowledge"}
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

function Figure({ label, value, detail, emphasis }) {
  return (
    <div className={cn("min-w-0 px-4 py-3", emphasis && "bg-[var(--attendance-absent)]/5")}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
      <p className={cn("mt-1 truncate text-xl font-semibold tabular-nums tracking-tight sm:text-2xl", emphasis ? "text-[var(--attendance-absent)]" : "text-foreground")}>{value}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{detail}</p>
    </div>
  );
}

export default function QuotationsPage() {
  const isAdmin = useSelector(selectIsAdmin);
  const currentUserId = useSelector((state) => state.user.userInfo?.id || "");
  const [params, setParams] = useSearchParams();
  const creating = params.get("view") === "create";
  const status = STATUS_TABS.some(([id]) => id === params.get("status")) ? params.get("status") : "all";
  // The edit drawer: { quotation, startPaid }, or null when closed. A new quotation opens full-page at "?view=create".
  const [formState, setFormState] = useState(null);
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const period = TIME_PERIODS.some(([id]) => id === params.get("period")) ? params.get("period") : "all";
  const customFrom = params.get("from") || "";
  const customTo = params.get("to") || "";
  const range = useMemo(() => periodRange(period, new Date(), { from: customFrom, to: customTo }), [period, customFrom, customTo]);

  const query = useQuotations({ range, enabled: isAdmin });
  const admins = useQuotationAdmins({ enabled: isAdmin });
  const nameById = useMemo(() => new Map((admins.data || []).map((admin) => [admin.id, admin.name])), [admins.data]);
  const acknowledgements = useQuotationAcknowledgements({ enabled: isAdmin });
  const acks = useMemo(() => acknowledgementsByQuotation(acknowledgements.data || [], nameById), [acknowledgements.data, nameById]);
  const save = useSaveQuotation();
  const acknowledge = useAcknowledgeQuotation();
  const deletion = useDeleteQuotation();
  const records = useMemo(() => query.data || [], [query.data]);
  const summary = useMemo(() => quotationSummary(records), [records]);
  const visible = useMemo(() => filterQuotations(records, { status, search }), [records, status, search]);
  const visibleTotal = visible.reduce((sum, record) => sum + amountOf(record), 0);
  const open = records.find((record) => record.id === params.get("quotation")) || null;
  const blank = query.isPending || query.isError;

  const updateParams = (changes) => setParams((current) => {
    const next = new URLSearchParams(current);
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    return next;
  });
  const closeForm = () => {
    setFormState(null);
    save.reset();
    if (creating) updateParams({ view: null });
  };
  const startCreate = () => {
    save.reset();
    setFormState(null);
    updateParams({ quotation: null, view: "create" });
  };
  // `startPaid` opens the drawer ready to add a payment.
  const startEdit = (quotation, startPaid = false) => {
    save.reset();
    updateParams({ quotation: null, view: null });
    setFormState({ quotation, startPaid });
  };
  const onSave = (values) => save.mutate(values, {
    onSuccess: () => {
      toast.success(values.id ? "Quotation updated." : "Quotation saved.");
      closeForm();
    },
  });
  const onAcknowledge = (quotation) => acknowledge.mutate(quotation, {
    onSuccess: () => toast.success(`Acknowledged ${quotation.quotation_number || quotation.name}.`),
    onError: (error) => toast.error(error.message),
  });
  const startDelete = (quotation) => {
    deletion.reset();
    updateParams({ quotation: null });
    setDeleteTarget(quotation);
  };
  const onDelete = () => deletion.mutate(deleteTarget.id, {
    onSuccess: () => {
      toast.success("Quotation deleted.");
      setDeleteTarget(null);
    },
  });
  const ackProps = (record) => ({
    acks: acks.get(record.id),
    awaiting: awaitingAcknowledgement(record, acks, admins.data || []),
    mine: needsAcknowledgement(record, acks, currentUserId) && !acknowledgements.isPending,
    pending: acknowledge.isPending && acknowledge.variables?.id === record.id,
    onAcknowledge: () => onAcknowledge(record),
  });

  if (!isAdmin) return null;

  if (creating) {
    return (
      <div className={`${pageGutter} w-full space-y-3`}>
        <div>
          <button type="button" onClick={closeForm} className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground">
            <ArrowLeft size={16} aria-hidden="true" /> All quotations
          </button>
          <h1 className="mt-1 text-xl font-semibold tracking-tight text-foreground sm:text-2xl">New quotation</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Record the work, who did it and what it costs. An invoice is generated when you save.</p>
        </div>
        <div className="rounded-2xl bg-card shadow-sm ring-1 ring-border/70">
          <QuotationForm wide admins={admins} currentUserId={currentUserId} saving={save.isPending} error={save.error?.message} onSave={onSave} onClose={closeForm} />
        </div>
      </div>
    );
  }

  return (
    <div className={`${pageGutter} w-full space-y-3`}>
      <header className="flex flex-col gap-3 rounded-2xl bg-card px-4 py-3.5 shadow-sm ring-1 ring-border/70 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">Accounts · Facilities</p>
          <h1 className="mt-0.5 text-xl font-semibold tracking-tight text-foreground sm:text-2xl">Quotation alerts</h1>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">Costs for work done around the office, such as electrical or plumbing jobs, with an invoice for each and what is still to be paid.</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => query.refetch()} disabled={query.isFetching} aria-label="Refresh quotations" className="rounded-xl border border-border p-2.5 text-muted-foreground transition hover:bg-muted disabled:opacity-50">
            <RefreshCw size={17} className={cn(query.isFetching && "animate-spin")} />
          </button>
          <button type="button" data-tour="quotation-new" onClick={startCreate} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            <Plus size={17} aria-hidden="true" /> New quotation
          </button>
        </div>
      </header>

      <PeriodBar period={period} from={customFrom} to={customTo} range={range} onChange={updateParams} />

      <section aria-label="Totals" data-tour="quotation-totals" className="grid grid-cols-1 divide-y divide-border overflow-hidden rounded-2xl bg-card shadow-sm ring-1 ring-border/70 sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4 lg:divide-x">
        <Figure label="Total billed" value={blank ? "—" : formatAmount(summary.billed)} detail={`${blank ? "—" : summary.count} quotation${summary.count === 1 ? "" : "s"}`} />
        <Figure label="Paid" value={blank ? "—" : formatAmount(summary.paid)} detail={`${blank ? "—" : summary.paidCount} settled`} />
        <Figure label="Outstanding" emphasis={!blank && summary.outstanding > 0} value={blank ? "—" : formatAmount(summary.outstanding)} detail={`${blank ? "—" : summary.unpaidCount} awaiting payment`} />
        <Figure label="Paid this month" value={blank ? "—" : formatAmount(summary.paidThisMonth)} detail={new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric" }).format(new Date())} />
      </section>

      <section aria-label="Quotations" className="overflow-hidden rounded-2xl bg-card shadow-sm ring-1 ring-border/70">
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
          <div role="tablist" aria-label="Payment status" className="flex gap-1 rounded-xl bg-muted p-1">
            {STATUS_TABS.map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={status === id}
                onClick={() => updateParams({ status: id === "all" ? null : id })}
                className={cn("flex-1 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold transition sm:flex-none", status === id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
              >
                {label}{" "}
                <span className="tabular-nums text-muted-foreground">{blank ? "" : { all: summary.count, unpaid: summary.unpaidCount, paid: summary.paidCount }[id]}</span>
              </button>
            ))}
          </div>
          <label className="flex w-full items-center gap-2 rounded-xl border border-border bg-background px-3 sm:max-w-xs">
            <Search size={16} className="text-muted-foreground" aria-hidden="true" />
            <input type="search" aria-label="Search quotations" placeholder="Search work, worker or number" value={search} onChange={(event) => setSearch(event.target.value)} className="w-full bg-transparent py-2.5 text-sm outline-none" />
          </label>
        </div>

        {query.isPending ? (
          <ul aria-busy="true">
            {[0, 1, 2, 3].map((index) => (
              <li key={index} className="flex animate-pulse items-center gap-4 border-b border-border p-5 last:border-0">
                <span className="h-4 w-20 rounded bg-muted" />
                <span className="flex-1 space-y-2"><span className="block h-4 w-2/5 rounded bg-muted" /><span className="block h-3 w-1/4 rounded bg-muted" /></span>
                <span className="h-4 w-24 rounded bg-muted" />
              </li>
            ))}
          </ul>
        ) : query.isError ? (
          <div role="alert" className="p-8 text-center text-sm text-destructive">
            {query.error?.message || "Could not load quotations."}{" "}
            <button type="button" onClick={() => query.refetch()} className="font-semibold underline">Try again</button>
          </div>
        ) : visible.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary"><ReceiptText size={22} aria-hidden="true" /></span>
            <p className="mt-4 font-semibold text-foreground">{records.length || range ? "No quotations match" : "No quotations yet"}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {records.length ? "Try another search or status." : range ? "Nothing was recorded in this period. Try another one." : "Add the first one when work is done around the office."}
            </p>
            {!records.length && !range && (
              <button type="button" onClick={startCreate} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"><Plus size={16} aria-hidden="true" /> New quotation</button>
            )}
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[1120px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50 text-left text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                    <th scope="col" className="px-4 py-2.5">Date</th>
                    <th scope="col" className="px-4 py-2.5">Work</th>
                    <th scope="col" className="px-4 py-2.5">Payee</th>
                    <th scope="col" className="px-4 py-2.5">Created by</th>
                    <th scope="col" className="px-4 py-2.5">Status</th>
                    <th scope="col" className="px-4 py-2.5">Paid by</th>
                    <th scope="col" className="px-4 py-2.5">Acknowledged by</th>
                    <th scope="col" className="px-4 py-2.5 text-right">Amount</th>
                    <th scope="col" className="px-4 py-2.5"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {visible.map((record) => {
                    const paid = isPaid(record);
                    const age = paid ? null : daysOutstanding(record);
                    const people = quotationPeople(record, nameById);
                    return (
                      <tr key={record.id} className="transition hover:bg-muted/40">
                        <td className="whitespace-nowrap px-4 py-3" title={record.date_entered || undefined}>
                          <p className="font-medium text-foreground">{record.date_entered_time_ago || "—"}</p>
                          {quotationDate(record) && <p className="text-[11px] tabular-nums text-muted-foreground">Work {formatDay(quotationDate(record))}</p>}
                        </td>
                        <td className="max-w-[280px] px-4 py-3">
                          <p className="truncate font-medium text-foreground">{record.name}</p>
                          <p className="truncate text-xs text-muted-foreground">{[record.category, record.work_location].filter(Boolean).join(" · ") || "—"}</p>
                        </td>
                        <td className="max-w-[220px] px-4 py-3">
                          <p className="truncate font-medium text-foreground">{record.worker_name}</p>
                          <p className="truncate text-xs text-muted-foreground">{[record.worker_company, record.worker_phone].filter(Boolean).join(" · ") || "—"}</p>
                        </td>
                        <td className="max-w-[160px] truncate px-4 py-3 text-foreground">{people.createdBy || <span className="text-muted-foreground">—</span>}</td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <StatusBadge paid={paid} />
                          <p className="mt-0.5 text-[11px] text-muted-foreground">
                            {paid ? [record.payment_method, formatDay(record.paid_on)].filter(Boolean).join(" · ") : age === null ? "" : age === 0 ? "Due today" : `${age} day${age === 1 ? "" : "s"} outstanding`}
                          </p>
                        </td>
                        <td className="max-w-[160px] truncate px-4 py-3 text-foreground">{people.paidBy || <span className="text-muted-foreground">—</span>}</td>
                        <td className="px-4 py-3"><AcknowledgedCell {...ackProps(record)} /></td>
                        <td className="whitespace-nowrap px-4 py-3 text-right font-semibold tabular-nums text-foreground">{formatAmount(amountOf(record))}</td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <div className="flex justify-end gap-1">
                            <button type="button" onClick={() => updateParams({ quotation: record.id })} aria-label={`Invoice for ${record.name}`} title="Invoice" className={iconButton}><FileText size={16} /></button>
                            <button type="button" onClick={() => startEdit(record)} aria-label={`Edit ${record.name}`} title="Edit" className={iconButton}><Pencil size={16} /></button>
                            <button type="button" onClick={() => startDelete(record)} aria-label={`Delete ${record.name}`} title="Delete" className={cn(iconButton, "hover:bg-destructive/10 hover:text-destructive")}><Trash2 size={16} /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-border bg-muted/30 font-semibold">
                    <td colSpan={7} className="px-4 py-3 text-xs uppercase tracking-[0.1em] text-muted-foreground">Total · {visible.length} quotation{visible.length === 1 ? "" : "s"}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-foreground">{formatAmount(visibleTotal)}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>

            <ul className="divide-y divide-border md:hidden">
              {visible.map((record) => {
                const paid = isPaid(record);
                const people = quotationPeople(record, nameById);
                return (
                  <li key={record.id} className="p-4">
                    <button type="button" onClick={() => updateParams({ quotation: record.id })} className="flex w-full items-start justify-between gap-3 text-left">
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-foreground">{record.name}</span>
                        <span className="block truncate text-xs text-muted-foreground">{record.worker_name} · {record.date_entered_time_ago || formatDay(quotationDate(record))}</span>
                        <span className="block truncate text-xs text-muted-foreground">
                          Created by {people.createdBy || "—"}{paid ? ` · Paid by ${people.paidBy || "—"}` : ""}
                        </span>
                        <span className="mt-1.5 block"><StatusBadge paid={paid} /></span>
                      </span>
                      <span className="shrink-0 text-right">
                        <span className="block font-semibold tabular-nums text-foreground">{formatAmount(amountOf(record))}</span>
                      </span>
                    </button>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <AcknowledgedCell {...ackProps(record)} />
                      <button type="button" onClick={() => startEdit(record)} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-xs font-semibold text-foreground">
                        <Pencil size={13} aria-hidden="true" /> Edit
                      </button>
                      <button type="button" onClick={() => startDelete(record)} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-destructive/30 px-3 text-xs font-semibold text-destructive">
                        <Trash2 size={13} aria-hidden="true" /> Delete
                      </button>
                    </div>
                  </li>
                );
              })}
              <li className="flex justify-between bg-muted/30 p-4 text-sm font-semibold">
                <span className="text-muted-foreground">Total</span>
                <span className="tabular-nums text-foreground">{formatAmount(visibleTotal)}</span>
              </li>
            </ul>
          </>
        )}
      </section>

      <QuotationInvoice
        quotation={open}
        people={open ? quotationPeople(open, nameById) : null}
        acknowledgement={open ? { ...ackProps(open), awaiting: awaitingAcknowledgement(open, acks, admins.data || []) } : null}
        onClose={() => updateParams({ quotation: null })}
        onEdit={startEdit}
        onDelete={startDelete}
        onAddPayment={(quotation) => startEdit(quotation, true)}
      />
      <AlertDialog.Root open={Boolean(deleteTarget)} onOpenChange={(open) => { if (!open && !deletion.isPending) setDeleteTarget(null); }}>
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="fixed inset-0 z-[110] bg-black/50" />
          <AlertDialog.Content className="fixed left-1/2 top-1/2 z-[111] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card p-6 text-foreground shadow-xl">
            <AlertDialog.Title className="text-xl font-semibold">Delete this quotation?</AlertDialog.Title>
            <AlertDialog.Description className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {deleteTarget?.quotation_number} · “{deleteTarget?.name}” for {formatAmount(amountOf(deleteTarget))} will be removed, together with its invoice and every admin’s acknowledgement. This can’t be undone.
            </AlertDialog.Description>
            {deletion.isError && <p role="alert" className="mt-3 text-sm text-destructive">{deletion.error?.message || "Could not delete the quotation."}</p>}
            <div className="mt-6 flex justify-end gap-3">
              <AlertDialog.Cancel disabled={deletion.isPending} className="rounded-lg border border-border px-4 py-2 text-sm disabled:opacity-50">Cancel</AlertDialog.Cancel>
              <button type="button" disabled={deletion.isPending} onClick={onDelete} className="rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground disabled:opacity-50">
                {deletion.isPending ? "Deleting..." : "Delete quotation"}
              </button>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
      <QuotationDrawer form={formState} admins={admins} currentUserId={currentUserId} saving={save.isPending} error={save.error?.message} onSave={onSave} onClose={closeForm} />
    </div>
  );
}
