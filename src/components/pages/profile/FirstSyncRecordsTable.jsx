import { Activity, MailCheck } from "lucide-react";

function FirstSyncRecordsTable({ records, result, onRecordClick, onShowActivity }) {
  const count = result?.count ?? records.length;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-cyan-600">
            <MailCheck size={20} />
            <p className="text-sm font-black uppercase tracking-widest">
              First Sync Records
            </p>
          </div>
          <h2 className="mt-2 text-xl font-black text-slate-950">
            Records found from your first sync
          </h2>
          <p className="mt-2 text-sm font-semibold text-slate-600">
            {result?.message || `First sync completed. Found: ${count}`}
          </p>
        </div>

        <button
          type="button"
          onClick={onShowActivity}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white transition hover:bg-slate-800"
        >
          <Activity size={16} />
          Show All Activity
        </button>
      </div>

      {records.length > 0 ? (
        <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs font-black uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Subject</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {records.map((record, index) => (
                <tr
                  key={record.message_id || record.thread_id || index}
                  onClick={() => onRecordClick(record)}
                  className="cursor-pointer transition hover:bg-cyan-50"
                >
                  <td className="px-4 py-3 font-bold text-slate-900">
                    {record.name || "Unknown"}
                  </td>
                  <td className="px-4 py-3 font-semibold text-cyan-700">
                    {record.email || "N/A"}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {record.subject || "No subject"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="mt-5 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
          <p className="text-sm font-black text-slate-700">
            No records were returned by the first sync.
          </p>
        </div>
      )}
    </section>
  );
}

export default FirstSyncRecordsTable;
