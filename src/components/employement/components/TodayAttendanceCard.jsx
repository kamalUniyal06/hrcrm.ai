import { Clock3, Fingerprint, LogIn, RotateCcw } from "lucide-react";
import { useMemo } from "react";
import Skeleton from "react-loading-skeleton";
import { useDailyActivity, useLogOut, useLunchIn, useLunchOut, useMarkPresent } from "../queries/dailyActivity.queries";
import TodayPresentCard from "./TodayPresentCard";

const apiDateKey = (value) => {
  const match = String(value || "").trim().match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  return match ? `${match[3]}-${match[1]}-${match[2]}` : null;
};
const todayInIndia = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());

function TodayAttendanceSkeleton(){return <section className="employee-card today-card"><div className="card-title-row"><Skeleton width={70} height={22}/><Skeleton width={65} height={24} borderRadius={999}/></div><div className="divider"/><div className="today-card__body"><div><Skeleton circle width={27} height={27}/><Skeleton count={2} width="85%"/><Skeleton width={130}/></div><Skeleton circle width={105} height={105}/></div><Skeleton height={42} borderRadius={10}/></section>}

export default function TodayAttendanceCard(){
  const {data,isPending,error,refetch}=useDailyActivity();
  const present=useMarkPresent(); const lunchIn=useLunchIn(); const lunchOut=useLunchOut(); const logout=useLogOut();
  const record=useMemo(()=>Array.isArray(data)?data[0]||null:data?.records?.[0]||data?.data?.[0]||null,[data]);
  const isPresentToday=apiDateKey(record?.login)===todayInIndia();
  if(isPending)return <TodayAttendanceSkeleton/>;
  if(error)return <section className="employee-card today-card"><div className="card-title-row"><h2 className="card-title">Today</h2><span className="status-badge">Error</span></div><div className="divider"/><div className="attendance-error"><Fingerprint size={32}/><p>Unable to load today's attendance.</p><button className="secondary-button" onClick={()=>refetch()}><RotateCcw size={15}/>Try Again</button></div></section>;
  if(!isPresentToday)return <section className="employee-card today-card"><div className="card-title-row"><h2 className="card-title">Today</h2><span className="status-badge">Absent</span></div><div className="divider"/><div className="today-card__body"><div><Fingerprint className="today-card__icon" size={27}/><p className="today-card__message">You have not marked yourself as present today!</p><div className="attendance-hint"><Clock3 size={15}/>Mark your attendance to start your day.</div></div><div className="progress-ring" style={{"--progress":0}}><div className="progress-ring__content"><strong>0%</strong><span>in office</span><small>ABSENT</small></div></div></div><button className="mark-present" disabled={present.isPending} onClick={()=>present.mutate()}>{present.isPending?'Marking Present...':<><LogIn size={17}/> Mark Present</>}</button></section>;
  return <TodayPresentCard record={record} actionLoading={lunchIn.isPending?'break':lunchOut.isPending?'back':logout.isPending?'checkout':null} handleTakeBreak={()=>lunchIn.mutate()} handleBackFromBreak={()=>lunchOut.mutate()} handleCheckOut={()=>logout.mutate()}/>;
}
