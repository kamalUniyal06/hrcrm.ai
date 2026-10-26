import { FileText, Settings } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import IconButton from "./ui/Buttons/IconButton";

export default function Footer() {
  const navigate = useNavigate();

  return (
    <footer
      className="hide-scrollbar relative z-40 flex h-12 shrink-0 items-center justify-between gap-2 overflow-x-auto overflow-y-hidden bg-white px-3.5 shadow-[0_-1px_4px_rgba(0,0,0,.08)]"
    >
      <IconButton
        icon={Settings}
        label="Settings"
        onClick={() => navigate("/settings")}
      />
      <Link
        to="/policies"
        data-tour="footer-policies"
        className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-muted-foreground transition hover:bg-muted hover:text-primary focus-visible:outline-2 focus-visible:outline-primary"
      >
        <FileText size={14} aria-hidden="true" />
        Terms &amp; policies
      </Link>
    </footer>
  );
}
