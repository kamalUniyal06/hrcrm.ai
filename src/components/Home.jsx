import { useUserInfo } from "@/queries/users.queries";
import EmployeHomePage from "./employement/pages/EmployeHomePage";
import LoadingPage from "./pages/LoadingPage";
import Profile from "./pages/Profile";
export default function Home() {
  const { data, isPending } = useUserInfo()
  const user = data?.records?.[0];
  if (isPending) return <LoadingPage />
  if (user?.stage == 'Full Time') return <EmployeHomePage />;
  return <Profile />
}
