import { Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";
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
    </footer>
  );
}
