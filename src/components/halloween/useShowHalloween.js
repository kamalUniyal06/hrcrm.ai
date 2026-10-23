import { useSelector } from "react-redux";
import { selectIsAdmin } from "@/utils/pageAccess";
import { canSeeHalloween, isHalloweenSeason } from "./hauntedOfficeToken";

const AUDIENCE = import.meta.env.VITE_SHOW_HALLOWEEN_THEME;

// True when the signed-in user should get the Halloween look and the game buttons.
export function useShowHalloween() {
  const isAdmin = useSelector(selectIsAdmin);
  const isEmployee = useSelector((state) => state.user.userInfo?.phase === "Employment");
  return isHalloweenSeason() && canSeeHalloween(AUDIENCE, { isAdmin, isEmployee });
}
