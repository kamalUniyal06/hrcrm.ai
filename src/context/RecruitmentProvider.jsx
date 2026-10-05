import { useCallback, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { selectIsAdmin } from "../utils/pageAccess";
import { recruitmentApiUrl, recruitmentRequest } from "../services/recruitmentApi";
import { getCrmToken, clearCrmToken } from "../services/crmAuth";
import { createRecruitmentSession } from "../services/recruitmentSession";
import { RecruitmentContext } from "./recruitmentContext";

export default function RecruitmentProvider({ children }) {
  const isAdmin = useSelector(selectIsAdmin);
  const owner = useSelector((state) => state.user.user?.id || state.user.user?.email || "anonymous");
  return <RecruitmentSession key={`${owner}:${isAdmin}`} owner={owner} isAdmin={isAdmin}>{children}</RecruitmentSession>;
}

function RecruitmentSession({ children, owner, isAdmin }) {
  const client = useQueryClient();
  const [connection] = useState(() => {
    // Remove the deprecated manual-login token for this HRCRM account.
    try { sessionStorage.removeItem(`hrcrm:recruitment:${recruitmentApiUrl}:${owner}`); } catch { /* Storage may be unavailable. */ }
    return createRecruitmentSession({ getCrmToken, clearCrmToken, request: recruitmentRequest });
  });
  const [links, setLinks] = useState({});
  useEffect(() => () => { connection.reset(); }, [connection]);
  const session = useQuery({
    queryKey: ["recruitment", owner, "session"],
    queryFn: () => connection.ensure(),
    enabled: isAdmin, staleTime: 60000, retry: false,
  });
  const request = useCallback(async (path, options) => {
    if (!isAdmin) throw new Error("HRCRM administrator access is required.");
    try { return await connection.request(path, options); }
    catch (error) { if (error.status === 401) void client.invalidateQueries({ queryKey: ["recruitment", owner, "session"] }); throw error; }
  }, [client, connection, isAdmin, owner]);
  const user = session.isSuccess ? session.data.user : null;
  const value = {
    isAdmin, owner, user, request, session,
    canInvite: Boolean(user && ["owner", "admin", "recruiter"].includes(user.role)),
    links, rememberLink: (id, link) => setLinks((previous) => ({ ...previous, [id]: link })),
  };
  return <RecruitmentContext.Provider value={value}>{children}</RecruitmentContext.Provider>;
}
