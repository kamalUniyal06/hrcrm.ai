import { Menu, X } from "lucide-react";
import { useContext } from "react";
import { PageContext } from "../context/pageContext";
import EmployeeOptions from "./employee-actions/EmployeeOptions";
import { useSelector } from "react-redux";

export function TopNav({ sidebarAvailable = true }) {
  const { mobileSidebarOpen, setMobileSidebarOpen } = useContext(PageContext);
  const userInfo = useSelector((s) => s.user.userInfo)

  return (
    <header
      data-tour="top-nav"
      className="sticky top-0 z-[999] flex min-h-10 w-full min-w-0 items-center rounded-xl border border-transparent bg-transparent p-1"
    >
      {sidebarAvailable && (
        <button
          type="button"
          onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
          aria-label={mobileSidebarOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={Boolean(mobileSidebarOpen)}
          aria-controls="app-sidebar"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600 active:scale-90 lg:hidden"
        >
          {mobileSidebarOpen ? (
            <X size={20} strokeWidth={2.2} />
          ) : (
            <Menu size={20} strokeWidth={2.2} />
          )}
        </button>
      )}
      {userInfo?.phase == 'Employment' && <EmployeeOptions />}
    </header>
  );
}
