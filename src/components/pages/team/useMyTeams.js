import { useMemo } from "react";
import { useOrgTree, useReportingTree } from "../../../queries/hr.queries";
import { buildReportingTree, peopleUnder, personId, teamsUnderMe } from "../../../utils/hrOrg";
import { recordsOf } from "../../../utils/hrRecords";

// The people in a team's card, lead first; the manager isn't one of its members.
export const inTeam = (team) => (team.lead ? [team.lead, ...team.members] : team.members);

/**
 * The user's team cards (`teamsUnderMe`), the people in them except the user (`people`, each once)
 * and `query`, a loading/error state for both trees.
 */
export default function useMyTeams({ me, directReports, hasReports }) {
  const tree = useOrgTree();
  const reporting = useReportingTree({ enabled: hasReports });
  const selfId = personId(me?.employee);
  const teams = useMemo(() => {
    // Without the reporting tree (it failed to load), the direct reports in `me` still count.
    const under = hasReports && reporting.isError
      ? recordsOf(directReports, ["people", "records", "data"])
      : peopleUnder(buildReportingTree(reporting.data), selfId);
    return teamsUnderMe(me, tree.data, under);
  }, [me, tree.data, reporting.data, reporting.isError, selfId, hasReports, directReports]);
  const people = useMemo(() => {
    const seen = new Set([selfId]);
    return teams.flatMap(inTeam).filter((person) => {
      const id = personId(person);
      return id && !seen.has(id) && seen.add(id);
    });
  }, [teams, selfId]);
  const query = { ...tree, isPending: tree.isPending || (hasReports && reporting.isPending), refetch: tree.refetch };
  return { teams, people, selfId, query };
}
