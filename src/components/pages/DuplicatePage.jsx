import { Mail, Activity } from "lucide-react";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useThreadContext } from "../../hooks/useThreadContext";
import { useDuplicateThreads } from "../../queries/threads.queries";
import { useTimeline } from "../../context/TimelineContext";

export const Duplicate = () => {
  const {  error } = useSelector(
    (state) => state.duplicateEmails,
  );
  const {currentEmail} = useTimeline()
  const {data,isPending:loading,isError} = useDuplicateThreads(currentEmail)
  const duplicateEmail = data?.data || [];
  const { handleMove } = useThreadContext();
  const navigate = useNavigate();


  useEffect(() => {
    if (isError) {
      toast.error("Failed to fetch duplicate emails!");
    }
  }, [isError]);

  // Convert object to iterable entries
  const entries = duplicateEmail ? Object.entries(duplicateEmail) : [];

  return (
    <div className="p-8">
      <div className="bg-white shadow-lg rounded-xl overflow-hidden border border-gray-200">
        {/* Table Header */}
        <div className="grid grid-cols-2 bg-green-600 text-white text-lg font-semibold px-8 py-4">
          <div className="flex items-center gap-2">
            <Mail size={22} /> DateTime
          </div>
          <div className="flex items-center gap-2">
            <Activity size={22} /> Subject
          </div>
        </div>

        {/* Table Body */}
        <div>
          {/* Loading */}
          {loading && (
            <p className="text-center py-6 text-lg text-gray-600">
              Loading duplicate emails...
            </p>
          )}

          {/* No Data */}
          {!loading && entries.length === 0 && (
            <p className="text-center py-6 text-lg text-gray-600">
              No duplicate emails found
            </p>
          )}

          {/* Rows */}
          {!loading &&
            duplicateEmail.map(thread => (
              <div
                key={thread.thread_id}
                className="grid grid-cols-2 px-8 py-5 border-b last:border-b-0 hover:bg-gray-50 transition"
              >
                {/* Date */}
                <div className="text-blue-600 font-medium">
                  {thread.date_created ? thread.date_created : "-"}
                </div>

                {/* Subject */}
                <button
                  onClick={() =>
                    handleMove({ email: thread.from_email, threadId: thread.thread_id })
                  }
                  className="text-gray-800 font-medium text-left cursor-pointer hover:text-blue-600"
                >
                  {thread.subject}
                </button>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
};
