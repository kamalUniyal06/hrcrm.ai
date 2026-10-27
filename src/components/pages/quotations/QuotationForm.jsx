import { useId, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Loader2, Save, X } from "lucide-react";
import { cn } from "@/lib/utils";
import PaidBySelect from "./PaidBySelect";
import { PAYMENT_METHODS, WORK_CATEGORIES, amountInWords, amountOf, formatAmount, isPaid, todayKey } from "./quotationUtils";

const fieldClass = "mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm font-normal text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";
const labelClass = "text-sm font-semibold text-foreground";
const optional = <span className="font-normal text-muted-foreground">(optional)</span>;

// `wide` (the full-page form) puts each section's title beside its fields on large screens.
function Section({ title, hint, wide, children }) {
  return (
    <fieldset className={cn("border-t border-border px-5 py-5 first:border-0 sm:px-6", wide && "lg:grid lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-8")}>
      <legend className="sr-only">{title}</legend>
      <div aria-hidden="true">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">{title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
      </div>
      <div className={cn("mt-4 grid gap-4 sm:grid-cols-2", wide && "lg:mt-0")}>{children}</div>
    </fieldset>
  );
}

/**
 * The fields of one quotation, used full-page for a new quotation (`wide`) and in the edit drawer.
 * `startPaid` opens a new payment: status Paid, with the payment fields showing.
 */
export function QuotationForm({ quotation, startPaid, wide = false, admins, currentUserId = "", saving, error, onSave, onClose }) {
  const id = useId();
  const field = (name) => `${id}-${name}`;
  const [values, setValues] = useState(() => ({
    id: quotation?.id || "",
    quotation_number: quotation?.quotation_number || "",
    name: quotation?.name || "",
    category: quotation?.category || "",
    work_date: quotation?.work_date || todayKey(),
    work_location: quotation?.work_location || "",
    description: quotation?.description || "",
    worker_name: quotation?.worker_name || "",
    worker_company: quotation?.worker_company || "",
    worker_phone: quotation?.worker_phone || "",
    amount: quotation?.amount || "",
    payment_status: startPaid || (quotation && isPaid(quotation)) ? "paid" : "unpaid",
    payment_method: quotation?.payment_method || "",
    paid_on: quotation?.paid_on || todayKey(),
    payment_reference: quotation?.payment_reference || "",
    payment_by_id: quotation?.payment_by_id || currentUserId,
    notes: quotation?.notes || "",
  }));
  const set = (changes) => setValues((current) => ({ ...current, ...changes }));
  const input = (name) => ({ id: field(name), value: values[name], onChange: (event) => set({ [name]: event.target.value }), className: fieldClass });
  const paid = values.payment_status === "paid";
  const amount = amountOf(values);
  // Editing opens on payment, since that is how a payment is added; a new quotation starts with the work.
  const paymentSection = (
    <Section wide={wide} title="Payment" hint="Mark it paid once the worker has been paid.">
      <div className={cn(labelClass, "sm:col-span-2")}>
        <span id={field("status")}>Payment status</span>
        <div role="radiogroup" aria-labelledby={field("status")} className="mt-1.5 grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
          {[["unpaid", "Not paid"], ["paid", "Paid"]].map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={values.payment_status === value}
              onClick={() => set({ payment_status: value })}
              className={cn(
                "rounded-md px-3 py-2 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                values.payment_status === value ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <label htmlFor={field("amount")} className={labelClass}>
        Amount (₹)
        <input required inputMode="decimal" placeholder="0.00" {...input("amount")} className={cn(fieldClass, "text-right font-semibold tabular-nums")} />
      </label>
      {paid && (
        <>
          <label htmlFor={field("payment_method")} className={labelClass}>
            Paid via
            <select required {...input("payment_method")}>
              <option value="">Choose a method</option>
              {PAYMENT_METHODS.map((method) => <option key={method} value={method}>{method}</option>)}
            </select>
          </label>
          <label htmlFor={field("payment_by_id")} className={labelClass}>
            Paid by
            <PaidBySelect
              id={field("payment_by_id")}
              value={values.payment_by_id}
              onChange={(payment_by_id) => set({ payment_by_id })}
              admins={admins}
              currentName={quotation?.payment_by_id_name}
              className={fieldClass}
            />
          </label>
          <label htmlFor={field("paid_on")} className={labelClass}>
            Paid on
            <input type="date" {...input("paid_on")} />
          </label>
          <label htmlFor={field("payment_reference")} className={cn(labelClass, "sm:col-span-2")}>
            Transaction or cheque number {optional}
            <input placeholder="e.g. UPI ref 4012 7788 1290" {...input("payment_reference")} />
          </label>
        </>
      )}
    </Section>
  );

  return (
    <form onSubmit={(event) => { event.preventDefault(); onSave(values); }} className="flex min-h-0 flex-1 flex-col">
      <fieldset disabled={saving} className={cn("min-w-0", !wide && "min-h-0 flex-1 overflow-y-auto")}>
        {quotation && paymentSection}

        <Section wide={wide} title="Work" hint="What was done, where and when. The title appears on the invoice.">
          <label htmlFor={field("name")} className={cn(labelClass, "sm:col-span-2")}>
            Work title
            <input required placeholder="e.g. Light fixing, 2nd floor" {...input("name")} />
          </label>
          <label htmlFor={field("category")} className={labelClass}>
            Category {optional}
            <select {...input("category")}>
              <option value="">Choose a category</option>
              {WORK_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
            </select>
          </label>
          <label htmlFor={field("work_date")} className={labelClass}>
            Work date
            <input type="date" {...input("work_date")} />
          </label>
          <label htmlFor={field("work_location")} className={cn(labelClass, "sm:col-span-2")}>
            Work location {optional}
            <input placeholder="e.g. Conference room, 2nd floor" {...input("work_location")} />
          </label>
          <label htmlFor={field("description")} className={cn(labelClass, "sm:col-span-2")}>
            Work description
            <textarea rows={3} placeholder="Replaced 6 tube lights and fixed loose wiring in the main switchboard." {...input("description")} className={cn(fieldClass, "resize-y")} />
          </label>
        </Section>

        <Section wide={wide} title="Worker" hint="Who did the work and gets paid. Shown as the payee on the invoice.">
          <label htmlFor={field("worker_name")} className={labelClass}>
            Worker name
            <input required autoComplete="off" placeholder="e.g. Ramesh Kumar" {...input("worker_name")} />
          </label>
          <label htmlFor={field("worker_phone")} className={labelClass}>
            Contact number {optional}
            <input type="tel" inputMode="tel" placeholder="+91 98765 43210" {...input("worker_phone")} />
          </label>
          <label htmlFor={field("worker_company")} className={cn(labelClass, "sm:col-span-2")}>
            Belongs to {optional}
            <input placeholder="Agency, shop or area, e.g. Sharma Electricals, Sector 62" {...input("worker_company")} />
          </label>
        </Section>

        {!quotation && paymentSection}

        <Section wide={wide} title="Other information" hint="Anything else worth keeping, such as warranty or materials used.">
          <label htmlFor={field("notes")} className={cn(labelClass, "sm:col-span-2")}>
            Notes {optional}
            <textarea rows={3} {...input("notes")} className={cn(fieldClass, "resize-y")} />
          </label>
        </Section>
      </fieldset>

      <footer className={cn("border-t border-border bg-card px-5 py-4 sm:px-6", wide && "sticky bottom-0 rounded-b-2xl")}>
        {error && <p role="alert" className="mb-3 rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-lg font-semibold tabular-nums tracking-tight text-foreground">{formatAmount(amount)}</p>
            <p className="truncate text-[11px] italic text-muted-foreground">{amount > 0 ? amountInWords(amount) : "Enter an amount"}</p>
          </div>
          <button type="button" onClick={onClose} disabled={saving} className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-50">Cancel</button>
          <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-90 disabled:opacity-60">
            {saving ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <Save size={16} aria-hidden="true" />}
            {quotation ? "Save changes" : "Save quotation"}
          </button>
        </div>
      </footer>
    </form>
  );
}

/**
 * Right-hand drawer to create or edit a quotation. `form` is null when closed, otherwise
 * { quotation, startPaid }: `quotation` is null for a new one. `admins` is the useQuotationAdmins() query.
 */
export default function QuotationDrawer({ form, admins, currentUserId = "", saving, error, onSave, onClose }) {
  const quotation = form?.quotation || null;
  return (
    <Dialog.Root open={Boolean(form)} onOpenChange={(open) => { if (!open && !saving) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[100] bg-black/40" />
        <Dialog.Content className="fixed inset-y-0 right-0 z-[101] flex w-full max-w-xl flex-col bg-card text-foreground shadow-2xl outline-none sm:rounded-l-2xl">
          <header className="flex items-start gap-3 border-b border-border px-5 py-4 sm:px-6">
            <div className="min-w-0 flex-1">
              <Dialog.Title className="truncate text-lg font-semibold">
                {quotation ? `Edit ${quotation.quotation_number || "quotation"}` : "New quotation"}
              </Dialog.Title>
              <Dialog.Description className="text-xs text-muted-foreground">
                {quotation ? quotation.name : "Record the work, who did it and what it costs. An invoice is generated when you save."}
              </Dialog.Description>
            </div>
            <Dialog.Close aria-label="Close" disabled={saving} className="grid size-9 shrink-0 place-items-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-50">
              <X size={18} />
            </Dialog.Close>
          </header>
          {form && (
            <QuotationForm
              key={`${quotation?.id || "new"}-${form.startPaid ? "pay" : "edit"}`}
              quotation={quotation}
              startPaid={form.startPaid}
              admins={admins}
              currentUserId={currentUserId}
              saving={saving}
              error={error}
              onSave={onSave}
              onClose={onClose}
            />
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
