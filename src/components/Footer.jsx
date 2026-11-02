import { ExternalLink, FileText, PlusCircle, Settings } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import IconButton from "./ui/Buttons/IconButton";

const CREATE_CRM_URL = "https://dev.outrightcrm.in/create_crm/";

const footerLinkClass =
  "inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-muted-foreground transition hover:bg-muted hover:text-primary focus-visible:outline-2 focus-visible:outline-primary";

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
      <div className="flex shrink-0 items-center gap-1">
        <a
          href={CREATE_CRM_URL}
          target="_blank"
          rel="noopener noreferrer"
          data-tour="footer-create-crm"
          className={footerLinkClass}
        >
          <PlusCircle size={14} aria-hidden="true" />
          Create CRM
          <ExternalLink size={12} aria-hidden="true" />
          <span className="sr-only">(opens in a new tab)</span>
        </a>
        <Link
          to="/policies"
          data-tour="footer-policies"
          className={footerLinkClass}
        >
          <FileText size={14} aria-hidden="true" />
          Terms &amp; policies
        </Link>
      </div>
    </footer>
  );
}
