import { Link } from "react-router-dom";
import { Loader2, LockKeyhole, RotateCw } from "lucide-react";
import { useHrAccess } from "../../hooks/useHrAccess";
import { SCOPE_LABELS } from "../../utils/hrAccess";

function AccessNeeded({ title, detail }) {
  return (
    <section role="alert" className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-border bg-card px-6 py-20 text-center">
      <span className="grid size-12 place-items-center rounded-[14px] border border-border bg-accent text-primary">
        <LockKeyhole size={24} aria-hidden="true" />
      </span>
      <p className="mt-5 text-[13px] font-semibold text-primary">Access needed</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
      <p className="mt-3 max-w-md text-sm leading-6 text-muted-foreground">{detail}</p>
      <Link to="/" className="mt-6 inline-flex min-h-11 items-center rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
        Back to home
      </Link>
    </section>
  );
}

/** Waits for `me`, then shows the page or explains why it can't. */
function Gate({ allowed, title, detail, children }) {
  const access = useHrAccess();
  if (access.isAdmin) return children;
  if (access.loading) {
    return (
      <div role="status" className="flex flex-1 items-center justify-center gap-2 py-20 text-sm text-muted-foreground">
        <Loader2 size={18} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
        Checking your access…
      </div>
    );
  }
  if (access.me.isError) {
    return (
      <section role="alert" className="flex flex-1 flex-col items-center justify-center gap-3 py-20 text-center">
        <p className="text-sm text-muted-foreground">{access.me.error?.message || "We couldn't check your access."}</p>
        <button type="button" onClick={() => access.me.refetch()} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border bg-card px-4 text-sm font-semibold text-foreground hover:border-primary/40 hover:text-primary">
          <RotateCw size={15} aria-hidden="true" /> Try again
        </button>
      </section>
    );
  }
  return allowed(access) ? children : <AccessNeeded title={title} detail={detail} />;
}

/** Shows the page only when `me.areas` includes the module. */
export function RequireArea({ module, children }) {
  return (
    <Gate
      allowed={(access) => access.hasArea(module)}
      title="This area isn't turned on for you"
      detail="Your role doesn't include this area yet. Ask HR or your admin to add it to your access role."
    >
      {children}
    </Gate>
  );
}

/** Shows the page only when the area's scope for `action` reaches at least `min`. */
export function RequireScope({ area, action = "read", min = "own", children }) {
  return (
    <Gate
      allowed={(access) => access.canAtLeast(area, action, min)}
      title="You can't open this page yet"
      detail={`This page needs "${SCOPE_LABELS[min] || min}" access or wider. Ask HR or your admin if you need it.`}
    >
      {children}
    </Gate>
  );
}
