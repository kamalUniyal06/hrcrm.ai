import { useCallback, useState } from "react";
import { useSelector } from "react-redux";
import toast from "react-hot-toast";
import { Loader2, QrCode, Trophy } from "lucide-react";
import { selectIsAdmin } from "@/utils/pageAccess";
import { Ghost } from "./HalloweenArt";
import HauntedOfficeQrDialog from "./HauntedOfficeQrDialog";
import { encryptName, hauntedOfficeBoardLink, hauntedOfficeLink, hauntedOfficePlayer } from "./hauntedOfficeToken";
import { useShowHalloween } from "./useShowHalloween";
import { useHalloweenThemeOn } from "./halloweenPreference";
import "./halloween.css";

const GAME_URL = import.meta.env.VITE_HAUNTED_OFFICE_URL;
const GAME_KEY = import.meta.env.VITE_HAUNTED_OFFICE_TOKEN_KEY;

/** Opens the Haunted Office game with the employee's name, encrypted so it can't be changed. */
export default function HauntedOfficeButton() {
  const user = useSelector((state) => state.user.user);
  const userInfo = useSelector((state) => state.user.userInfo);
  const isAdmin = useSelector(selectIsAdmin);
  const switchedOn = useHalloweenThemeOn();
  const [opening, setOpening] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  // Shown only when allowed by .env and the person has the Halloween switch on.
  const show = useShowHalloween() && switchedOn;
  const player = hauntedOfficePlayer({ name: user?.name, email: user?.email, employeeId: userInfo?.id });
  // The personal game link, with the name encrypted in ?t=.
  const makeLink = useCallback(
    async () => hauntedOfficeLink(GAME_URL, await encryptName(player.name, { emp: player.emp }, GAME_KEY)),
    [player.name, player.emp],
  );
  if (!GAME_URL || !GAME_KEY || !show) return null;

  const play = async () => {
    // Open the tab inside the click so popup blockers allow it, then point it at the game.
    const tab = window.open("", "_blank");
    if (tab) tab.opener = null;
    setOpening(true);
    try {
      const link = await makeLink();
      if (tab) tab.location.href = link;
      else window.location.assign(link);
    } catch {
      tab?.close();
      toast.error("Couldn't open the Haunted Office. Please try again.");
    } finally {
      setOpening(false);
    }
  };

  return (
    <>
    <button
      type="button"
      onClick={play}
      disabled={opening}
      aria-label="Play Haunted Office, the Halloween game"
      className="group relative flex h-11 shrink-0 items-center gap-2 overflow-hidden rounded-xl border border-[#f97316]/50 bg-gradient-to-br from-[#2e1065] to-[#7c2d12] px-2.5 text-left text-white shadow-[0_8px_24px_rgba(234,88,12,0.25)] transition hover:-translate-y-0.5 hover:shadow-[0_10px_28px_rgba(234,88,12,0.4)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#fb923c] active:scale-[0.98] disabled:opacity-80 sm:pr-3.5"
    >
      <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-white/10">
        {opening ? <Loader2 size={15} className="animate-spin" aria-hidden="true" /> : <Ghost size={18} className="ho-float" />}
      </span>
      <span className="hidden leading-none sm:block">
        <span className="block text-sm font-bold tracking-tight">Haunted Office</span>
        <span className="mt-1 block text-[10px] font-medium text-orange-200">Play the Halloween game</span>
      </span>
    </button>
    <button
      type="button"
      onClick={() => setQrOpen(true)}
      aria-label="Play Haunted Office on your phone: show a QR code"
      title="Play on your phone"
      className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-[#f97316]/50 bg-card shadow-sm transition hover:-translate-y-0.5 hover:border-[#f97316] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#fb923c] active:scale-[0.98]"
    >
      <QrCode size={18} className="text-[#7c2d12]" aria-hidden="true" />
    </button>
    <HauntedOfficeQrDialog open={qrOpen} onOpenChange={setQrOpen} makeLink={makeLink} playerName={player.name} />
    {/* The leaderboard is for admins only. */}
    {isAdmin && (
      <a
        href={hauntedOfficeBoardLink(GAME_URL)}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Haunted Office leaderboard (opens in a new tab)"
        title="Leaderboard"
        className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-[#f97316]/50 bg-card shadow-sm transition hover:-translate-y-0.5 hover:border-[#f97316] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#fb923c] active:scale-[0.98]"
      >
        <Trophy size={18} className="text-[#ea580c]" aria-hidden="true" />
      </a>
    )}
    </>
  );
}
