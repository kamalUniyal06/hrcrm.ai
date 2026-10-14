import EmployeHomePage from "./employement/pages/EmployeHomePage";
import Profile from "./pages/Profile";
import LoadingPage from "./pages/LoadingPage";
import CandidateHomePage from "./pages/candidate-home/CandidateHomePage";
import { needsOnboarding } from "./pages/profile/onboardingState";
import { useCandidateProfile } from "../queries/candidate.queries";
import { selectIsAdmin } from "../utils/pageAccess";
import { useSelector } from "react-redux";
export default function Home() {
  const userInfo = useSelector((s) => s.user.userInfo)
  const isAdmin = useSelector(selectIsAdmin);
  if (userInfo?.phase == 'Employment') return <EmployeHomePage />;
  if (isAdmin) return <Profile />;
  return <CandidateHome />;
}

// Onboarding stays on Profile; the dashboard needs a saved, completed candidate.
function CandidateHome() {
  const profile = useCandidateProfile();
  if (profile.isPending && profile.fetchStatus !== "idle") return <LoadingPage />;
  if (!profile.data || needsOnboarding(profile.data)) return <Profile />;
  return <CandidateHomePage />;
}
