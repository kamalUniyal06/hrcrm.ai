import { createPortal } from "react-dom";
import * as Dialog from "@radix-ui/react-dialog";
import { BadgeCheck, CheckCheck, Pencil, Printer, Trash2, Wallet, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { amountInWords, amountOf, formatAmount, formatDay, isPaid, quotationDate } from "./quotationUtils";

// Shown as "Billed to" on every invoice.
const COMPANY_NAME = import.meta.env.VITE_COMPANY_NAME || "HRCRM";

function PartyBlock({ label, lines }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className="mt-1.5 break-words text-sm font-semibold text-foreground">{lines[0] || "—"}</p>
      {lines.slice(1).filter(Boolean).map((line) => <p key={line} className="break-words text-sm text-muted-foreground">{line}</p>)}
    </div>
  );
}

/** The invoice itself, laid out like a printed A4 accounting document. */
export function InvoiceDocument({ quotation, people = {} }) {
  const paid = isPaid(quotation);
  const amount = amountOf(quotation);
  const date = quotationDate(quotation);
  const meta = [
    ["Invoice no.", quotation.quotation_number || "—"],
    ["Invoice date", formatDay(date) || "—"],
    ["Work date", formatDay(quotation.work_date) || "—"],
  ];

  return (
    <article className="relative mx-auto w-full max-w-[794px] bg-card text-foreground">
      <header className="flex flex-col gap-5 border-b-2 border-foreground pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-lg font-bold tracking-tight">{COMPANY_NAME}</p>
          <p className="text-xs text-muted-foreground">Facilities &amp; maintenance</p>
        </div>
        <div className="sm:text-right">
          <h2 className="text-2xl font-light uppercase tracking-[0.3em] text-foreground">Invoice</h2>
          <dl className="mt-2 grid grid-cols-[auto_auto] gap-x-4 gap-y-0.5 text-xs sm:justify-end">
            {meta.map(([label, value]) => (
              <div key={label} className="contents">
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="font-semibold tabular-nums">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </header>

      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute right-6 top-28 -rotate-12 rounded-md border-[3px] px-3 py-1 text-lg font-black uppercase tracking-[0.2em] opacity-70",
          paid ? "border-[var(--attendance-present)] text-[var(--attendance-present)]" : "border-[var(--attendance-absent)] text-[var(--attendance-absent)]",
        )}
      >
        {paid ? "Paid" : "Unpaid"}
      </span>

      <section className="grid gap-5 py-5 sm:grid-cols-2">
        <PartyBlock label="Payee (work done by)" lines={[quotation.worker_name, quotation.worker_company, quotation.worker_phone && `Phone: ${quotation.worker_phone}`]} />
        <PartyBlock label="Billed to" lines={[COMPANY_NAME, quotation.work_location && `Site: ${quotation.work_location}`]} />
      </section>

      <table className="w-full border-collapse text-sm">
        <caption className="sr-only">Work billed</caption>
        <thead>
          <tr className="border-y border-border bg-muted/60 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            <th scope="col" className="w-10 px-3 py-2">#</th>
            <th scope="col" className="px-3 py-2">Description of work</th>
            <th scope="col" className="hidden px-3 py-2 sm:table-cell print:table-cell">Category</th>
            <th scope="col" className="px-3 py-2 text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-border align-top">
            <td className="px-3 py-3 tabular-nums text-muted-foreground">1</td>
            <td className="px-3 py-3">
              <p className="font-semibold">{quotation.name}</p>
              {quotation.description && <p className="mt-1 whitespace-pre-line text-muted-foreground">{quotation.description}</p>}
            </td>
            <td className="hidden px-3 py-3 text-muted-foreground sm:table-cell print:table-cell">{quotation.category || "—"}</td>
            <td className="px-3 py-3 text-right font-medium tabular-nums">{formatAmount(amount)}</td>
          </tr>
        </tbody>
      </table>

      <div className="mt-4 flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <p className="max-w-sm text-xs text-muted-foreground">
          <span className="block text-[10px] font-semibold uppercase tracking-[0.16em]">Amount in words</span>
          <span className="mt-1 block italic text-foreground">{amountInWords(amount)}</span>
        </p>
        <dl className="w-full text-sm sm:w-64">
          <div className="flex justify-between px-3 py-1.5"><dt className="text-muted-foreground">Subtotal</dt><dd className="tabular-nums">{formatAmount(amount)}</dd></div>
          <div className="flex justify-between border-y-2 border-foreground px-3 py-2 font-bold"><dt>Total</dt><dd className="tabular-nums">{formatAmount(amount)}</dd></div>
          <div className="flex justify-between px-3 py-1.5"><dt className="text-muted-foreground">Amount paid</dt><dd className="tabular-nums">{formatAmount(paid ? amount : 0)}</dd></div>
          <div className="flex justify-between px-3 py-1.5 font-semibold"><dt>Balance due</dt><dd className="tabular-nums">{formatAmount(paid ? 0 : amount)}</dd></div>
        </dl>
      </div>

      <section className="mt-6 grid grid-cols-2 gap-4 rounded-lg border border-border p-4 text-sm sm:grid-cols-5 print:grid-cols-5">
        {[
          ["Payment status", paid ? "Paid" : "Not paid"],
          ["Paid via", paid ? quotation.payment_method || "—" : "—"],
          ["Paid on", paid ? formatDay(quotation.paid_on) || "—" : "—"],
          ["Reference", paid ? quotation.payment_reference || "—" : "—"],
          ["Paid by", paid ? people.paidBy || "—" : "—"],
        ].map(([label, value]) => (
          <div key={label} className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
            <p className="mt-1 break-words font-medium">{value}</p>
          </div>
        ))}
      </section>

      {quotation.notes && (
        <section className="mt-4 text-sm">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Notes</p>
          <p className="mt-1 whitespace-pre-line text-muted-foreground">{quotation.notes}</p>
        </section>
      )}

      <footer className="mt-12 grid grid-cols-2 gap-8 text-xs text-muted-foreground">
        <p className="border-t border-foreground/60 pt-2">Received by (payee)</p>
        <p className="border-t border-foreground/60 pt-2 text-right">Authorised signatory</p>
      </footer>
      <p className="mt-6 text-center text-[10px] text-muted-foreground">
        Computer-generated invoice{people.createdBy ? ` · recorded by ${people.createdBy}` : ""}.
      </p>
    </article>
  );
}

/** Invoice preview with print, edit and record-payment actions. */
/** Who has acknowledged the quotation and who hasn't yet. Shown on screen only, not on the printed invoice. */
function AcknowledgementStrip({ acks = [], awaiting = [], mine, pending, onAcknowledge }) {
  return (
    <section aria-label="Acknowledgements" className="flex flex-col gap-2 border-b border-border bg-card px-4 py-3 text-xs sm:flex-row sm:items-center sm:px-5">
      <div className="min-w-0 flex-1 space-y-1">
        <p className="text-muted-foreground">
          <span className="font-semibold text-foreground">Acknowledged by: </span>
          {acks.length ? acks.map((ack) => `${ack.name || "Unknown admin"}${ack.at ? ` (${formatDay(ack.at.slice(0, 10))})` : ""}`).join(", ") : "No one yet"}
        </p>
        {awaiting.length > 0 && (
          <p className="text-muted-foreground">
            <span className="font-semibold text-foreground">Waiting on: </span>
            {awaiting.map((admin) => admin.name).join(", ")}
          </p>
        )}
      </div>
      {mine && (
        <button type="button" onClick={onAcknowledge} disabled={pending} className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-[var(--attendance-late)] px-3 py-2 font-semibold text-white transition hover:opacity-90 disabled:opacity-60">
          <CheckCheck size={14} aria-hidden="true" /> {pending ? "Saving…" : "Acknowledge"}
        </button>
      )}
    </section>
  );
}

export default function QuotationInvoice({ quotation, people, acknowledgement, onClose, onEdit, onDelete, onAddPayment }) {
  const paid = quotation && isPaid(quotation);
  return (
    <>
      <Dialog.Root open={Boolean(quotation)} onOpenChange={(open) => { if (!open) onClose(); }}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[100] bg-black/50 print:hidden" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-[101] flex max-h-[92vh] w-[calc(100%-1.5rem)] max-w-4xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-border bg-muted text-card-foreground shadow-xl print:hidden">
            <header className="flex flex-wrap items-center gap-2 border-b border-border bg-card px-4 py-3 sm:px-5">
              <div className="min-w-0 flex-1">
                <Dialog.Title className="truncate text-base font-semibold text-foreground">Invoice {quotation?.quotation_number}</Dialog.Title>
                <Dialog.Description className="truncate text-xs text-muted-foreground">{quotation?.name}</Dialog.Description>
              </div>
              {quotation && !paid && (
                <button type="button" onClick={() => onAddPayment(quotation)} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground transition hover:opacity-90">
                  <Wallet size={14} aria-hidden="true" /> Add payment
                </button>
              )}
              {paid && <span className="inline-flex items-center gap-1 rounded-lg bg-[var(--attendance-present)]/10 px-2.5 py-2 text-xs font-semibold text-[var(--attendance-present)]"><BadgeCheck size={14} aria-hidden="true" /> Paid</span>}
              <button type="button" onClick={() => onEdit(quotation)} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-semibold text-foreground transition hover:bg-muted">
                <Pencil size={14} aria-hidden="true" /> Edit
              </button>
              <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-semibold text-foreground transition hover:bg-muted">
                <Printer size={14} aria-hidden="true" /> Print / PDF
              </button>
              <button type="button" onClick={() => onDelete(quotation)} aria-label="Delete quotation" title="Delete" className="grid size-9 place-items-center rounded-lg text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive">
                <Trash2 size={16} />
              </button>
              <Dialog.Close aria-label="Close invoice" className="grid size-9 place-items-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground">
                <X size={18} />
              </Dialog.Close>
            </header>
            {acknowledgement && <AcknowledgementStrip {...acknowledgement} />}
            <div className="overflow-y-auto p-3 sm:p-6">
              {quotation && (
                <div className="rounded-lg bg-card p-5 shadow-sm ring-1 ring-border sm:p-10">
                  <InvoiceDocument quotation={quotation} people={people || undefined} />
                </div>
              )}
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
      {/* Only this copy is printed; index.css hides the rest of the app while it is on the page. */}
      {quotation && createPortal(<div className="invoice-print-root hidden print:block"><InvoiceDocument quotation={quotation} people={people || undefined} /></div>, document.body)}
    </>
  );
}
