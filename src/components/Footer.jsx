import { Settings } from "lucide-react";
import { useContext } from "react";
import IconButton from "./ui/Buttons/IconButton";
import { PageContext } from "../context/pageContext";
import { useNavigate } from "react-router-dom";


export default function Footer() {

  const { collapsed } = useContext(PageContext);
  const navigate = useNavigate()


  return (
    <footer
      className={`fixed bottom-0 right-0 z-40 flex h-12 items-center justify-between gap-2 overflow-x-auto overflow-y-hidden hide-scrollbar bg-white px-3.5 shadow-[0_-1px_4px_rgba(0,0,0,.08)] transition-[left] duration-300 max-lg:left-0 ${collapsed ? "lg:left-[80px]" : "lg:left-[260px]"
        }`}
    >
      <IconButton icon={Settings} label="Settings" onClick={() => navigate("/settings")} />
    </footer >
  );
}
