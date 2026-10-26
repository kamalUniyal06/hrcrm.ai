import { ShieldCheck } from "lucide-react";

/** Small strip at the top of admin-only pages. */
export default function AdminPageNotice() {
  return (
    <p className="mb-3 inline-flex items-center gap-1.5 self-start rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
      <ShieldCheck size={14} aria-hidden="true" />
      Admin only page
    </p>
  );
}
