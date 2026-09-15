import EmployeHomePage from "./employement/pages/EmployeHomePage";
import Profile from "./pages/Profile";
import { useSelector } from "react-redux";
export default function Home() {
  const userInfo = useSelector((s) => s.user.userInfo)
  if (userInfo?.phase == 'Employment') return <EmployeHomePage />;
  return <Profile />
}
