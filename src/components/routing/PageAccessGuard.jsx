import { useSelector } from "react-redux";
import { Link, useLocation } from "react-router-dom";
import { ShieldX } from "lucide-react";
import { isAdminPage, selectIsAdmin } from "../../utils/pageAccess";

export default function PageAccessGuard({ children }) {
  const { pathname } = useLocation();
  const isAdmin = useSelector(selectIsAdmin);

  if (!isAdminPage(pathname) || isAdmin) return children;

  return (
    <section role="alert" className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 py-20 text-center">
      <ShieldX size={44} className="text-red-500" aria-hidden="true" />
      <p className="mt-5 text-sm font-semibold text-red-600">403 · Access denied</p>
      <h1 className="mt-3 text-2xl font-semibold text-slate-900">You are not authorized to enter this page.</h1>
      <p className="mt-3 text-sm text-slate-500">This page is available to administrators only.</p>
      <Link to="/" className="mt-6 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700">Back to home</Link>
    </section>
  );
}
