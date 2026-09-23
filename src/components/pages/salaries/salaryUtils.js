export const clean = value => String(value ?? "").trim();

export const salaryName = record => clean(record.hrc_employees_hrc_salaries_1_name) ||
  clean(record.hrc_candidates_hrc_salaries_1_name) || clean(record.name) || "Unnamed employee";

export function amount(value) {
  const text = clean(value);
  if (!text) return null;
  const number = Number(text);
  return Number.isFinite(number) ? number : null;
}

export const formatAmount = value => {
  const number = amount(value);
  return number === null ? "—" : number.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export function difference(record) {
  const offered = amount(record.offered_salary);
  const paid = amount(record.paid_amount);
  return offered === null || paid === null ? null : offered - paid;
}
