/**
 * "Paid by" dropdown listing every admin. `admins` is the useQuotationAdmins() query. A payer who
 * isn't in the list (a removed admin, or sample data) stays selectable under `currentName`.
 */
export default function PaidBySelect({ id, value, onChange, admins, currentName = "", className }) {
  const list = admins.data || [];
  const missing = value && !list.some((admin) => admin.id === value);
  return (
    <>
      <select id={id} required value={value} onChange={(event) => onChange(event.target.value)} disabled={admins.isPending} className={className}>
        <option value="">{admins.isPending ? "Loading admins…" : "Choose an admin"}</option>
        {missing && <option value={value}>{currentName || "Previous payer"}</option>}
        {list.map((admin) => (
          <option key={admin.id} value={admin.id}>{admin.name}{admin.email ? ` (${admin.email})` : ""}</option>
        ))}
      </select>
      {admins.isError && <span role="alert" className="mt-1 block text-xs font-normal text-destructive">Admins could not be loaded. Refresh to try again.</span>}
    </>
  );
}
