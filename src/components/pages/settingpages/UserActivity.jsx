import React, { useContext } from "react";
import Header from "./Header";
import { SocketContext } from "../../../context/SocketContext";
import { useCrmUsers } from "../../../queries/users.queries";

const UserActivity = () => {
  const { activeUsers } = useContext(SocketContext);
  const { data: crmUsers } = useCrmUsers()
  const getName = (email, name) => {
    return crmUsers?.find((user) => user.description === email)?.name || name;
  }
  const sortedUsers = [...activeUsers].sort((a, b) => {
    if (a?.status === "online" && b?.status !== "online") return -1;
    if (a?.status !== "online" && b?.status === "online") return 1;
    return 0;
  });

  return (
    <div className="p-3 sm:p-6 lg:p-8">
      <Header text={"User Activity"} />

      {/* The wrapper was `overflow-hidden`, which clipped the 5-column table on
          narrow screens instead of letting it scroll. */}
      <div className="mt-6 bg-white border rounded-lg overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm lg:min-w-0">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="p-3">User</th>
              <th className="p-3">Email</th>
              <th className="p-3">Status</th>
              <th className="p-3">Current Page</th>
              <th className="p-3">Last Active</th>
            </tr>
          </thead>

          <tbody>
            {sortedUsers.map((user) => (
              <tr key={user.email} className="border-t hover:bg-gray-50 transition-colors">
                <td className="p-3">{getName(user.email, user.name)}</td>
                <td className="p-3">{user.email}</td>
                <td className="p-3">
                  <span
                    className={
                      user?.status === "online"
                        ? "text-green-600 font-medium"
                        : "text-yellow-600 font-medium"
                    }
                  >
                    {user?.status === "online" ? "online" : "idle"}
                  </span>
                </td>
                <td className="p-3">{user.page === "/" ? "/timeline" : user.page}</td>
                <td className="p-3">
                  {user.lastActiveAt
                    ? new Date(user.lastActiveAt).toLocaleString()
                    : "-"}
                </td>
              </tr>
            ))}

            {sortedUsers.length === 0 && (
              <tr>
                <td className="p-4 text-gray-500" colSpan="5">
                  No active users right now.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default UserActivity;