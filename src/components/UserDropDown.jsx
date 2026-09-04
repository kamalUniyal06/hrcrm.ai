import React, { useState, useEffect, useRef } from "react";
import Loading, { LoadingChase } from "./Loading";
import { X } from "lucide-react";
import { useCrmUsers } from "../queries/users.queries";
import { getCurrentUser } from "../services/utils";
import { useTimeline } from "../context/TimelineContext";

const UserDropdown = ({assignedId, forwardHandler, onClose }) => {
  const [selectedUser, setSelectedUser] = useState(null);
  const dropdownRef = useRef(null);
  const { data: users, isPending: loading } = useCrmUsers();
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  return (
    <div
      ref={dropdownRef}
      onClick={(e) => e.stopPropagation()}
      className="absolute top-14 -right-8 w-72 bg-white rounded-lg shadow-xl border border-gray-200 p-3 z-[999]"
    >
      <div className="flex justify-between items-center mb-2  rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 p-2 text-white ">
        <h3 className="font-semibold  ">Assign To</h3>
      </div>

      {/* User List */}
      {loading ? (
        <LoadingChase />
      ) : (
        <>
          {" "}
          <div className="max-h-52 overflow-y-auto space-y-1 scrollbar-thin scrollbar-thumb-gray-300">
            {users?.length === 0 ? (
              <p className="text-sm text-gray-500 text-center">
                No users available
              </p>
            ) : (
              users?.filter((user) => user.id !== getCurrentUser()?.id && user.id !== assignedId).map((user, index) => (
                <div
                  key={index}
                  onClick={() => setSelectedUser(user)}
                  className={`p-2 rounded-lg cursor-pointer border transition-all
              ${selectedUser?.name === user.name
                      ? "bg-blue-100 border-blue-400"
                      : "hover:bg-gray-100 border-transparent"
                    }`}
                >
                  <p className="font-medium text-gray-700">{user.name}</p>
                </div>
              ))
            )}
          </div>
          {/* Forward Button */}
          <button
            onClick={() => {
              onClose();
              selectedUser &&
                forwardHandler(selectedUser.id);
            }}
            disabled={!selectedUser}
            className={`w-full mt-3 py-2 rounded-lg text-sm text-white transition-all
          ${selectedUser
                ? "bg-blue-600 hover:bg-blue-700 active:scale-95 cursor-pointer"
                : "bg-gray-400 cursor-not-allowed"
              }
        `}
          >
            Forward Email
          </button>
        </>
      )}
    </div>
  );
};

export default UserDropdown;
