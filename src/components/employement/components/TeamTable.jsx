const people = [
  [
    "AG",
    "Alena Gouse",
    "UI Designer - UID1",
    "11:56 AM",
    "12:45 AM",
    "10:44 AM",
  ],
  [
    "MV",
    "Miracle Vetrovs",
    "UX Designer - UXD2",
    "—",
    "10:33 AM",
    "on leave",
  ],
  [
    "AA",
    "Avery Arwood",
    "UI Designer - UID2",
    "wfh",
    "10:21 AM",
    "wfh",
  ],
  [
    "JE",
    "John Edgewood",
    "Product Designer",
    "11:42 AM",
    "09:58 AM",
    "10:08 AM",
  ],
];

const Marker = ({ value, index }) => {
  const dotColor =
    value === "on leave"
      ? "bg-red-500"
      : value === "wfh"
        ? "bg-yellow-500"
        : index === 0
          ? "bg-primary"
          : "bg-muted-foreground";

  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs text-foreground">
      <i className={`h-2 w-2 shrink-0 rounded-full ${dotColor}`} />
      {value}
    </span>
  );
};

export default function TeamTable() {
  return (
    <section className="min-w-0 rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
      {/* Header */}
      <h2 className="text-base font-semibold text-foreground">
        My Team
      </h2>

      {/* Legend */}
      <div className="mt-3 mb-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <i className="h-2 w-2 rounded-full bg-primary" />
          in office
        </span>

        <span className="inline-flex items-center gap-1.5">
          <i className="h-2 w-2 rounded-full bg-yellow-500" />
          work from home
        </span>

        <span className="inline-flex items-center gap-1.5">
          <i className="h-2 w-2 rounded-full bg-red-500" />
          on leave
        </span>

        <span className="inline-flex items-center gap-1.5">
          <i className="h-2 w-2 rounded-full bg-muted-foreground" />
          absent
        </span>

        <span className="inline-flex items-center gap-1.5">
          <span className="text-sm leading-none">○</span>
          holiday
        </span>
      </div>

      {/* Table */}
      <div className="w-full overflow-x-auto">
        <table className="w-full min-w-[570px] border-separate border-spacing-y-1 text-left">
          <thead>
            <tr>
              <th className="rounded-l-lg bg-muted px-3 py-2.5 text-[10px] font-medium text-muted-foreground">
                Members
              </th>

              <th className="bg-muted px-3 py-2.5 text-[10px] font-medium text-muted-foreground">
                Today
              </th>

              <th className="bg-muted px-3 py-2.5 text-[10px] font-medium text-muted-foreground">
                25/9
              </th>

              <th className="bg-muted px-3 py-2.5 text-[10px] font-medium text-muted-foreground">
                24/9
              </th>

              <th className="rounded-r-lg bg-muted px-3 py-2.5 text-[10px] font-medium text-muted-foreground">
                23/9
              </th>
            </tr>
          </thead>

          <tbody>
            {people.map((person, index) => (
              <tr key={person[1]}>
                {/* Member */}
                <td className="border-b border-border px-3 py-2">
                  <div className="flex items-center gap-2.5">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                      {person[0]}
                    </span>

                    <div className="min-w-0">
                      <strong className="block whitespace-nowrap text-xs font-semibold text-foreground">
                        {person[1]}
                      </strong>

                      <small className="block whitespace-nowrap text-[10px] text-muted-foreground">
                        {person[2]}
                      </small>
                    </div>
                  </div>
                </td>

                {/* Today */}
                <td className="border-b border-border px-3 py-2">
                  <Marker
                    value={person[3]}
                    index={index}
                  />
                </td>

                {/* 25/9 */}
                <td className="border-b border-border px-3 py-2">
                  <Marker
                    value={person[4]}
                    index={0}
                  />
                </td>

                {/* 24/9 */}
                <td className="border-b border-border px-3 py-2">
                  <Marker
                    value={person[5]}
                    index={
                      person[5] === "on leave"
                        ? 2
                        : 0
                    }
                  />
                </td>

                {/* 23/9 */}
                <td className="whitespace-nowrap border-b border-border px-3 py-2 text-xs text-muted-foreground">
                  ○ weekend
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}