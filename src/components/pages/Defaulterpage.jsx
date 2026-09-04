import {
  Calendar,
  User,
  FileText,
  MessageSquare,
  BarChart,
  EqualApproximatelyIcon,
} from "lucide-react";

import { useState, useEffect, useContext } from "react";

import { useDispatch, useSelector } from "react-redux";
import Pagination from "../Pagination";

import { getContactDefaulters } from "../../store/Slices/contactdefaulterSlice";

import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useThreadContext } from "../../hooks/useThreadContext"

export function DefaulterPage() {
  const navigate = useNavigate();
  const {
    loading,
    detection = [],
    count,
  } = useSelector((state) => state.contactdefaulter);

  const { handleMove } = useThreadContext()
  const dispatch = useDispatch();
  useEffect(() => {
    dispatch(getContactDefaulters());
  }, []);

  return (
    <>


      {/* Defaulter Section */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            {/* Back Button */}
            <button
              onClick={() => navigate(-1)}
              className="p-2 rounded-full bg-green-100 hover:bg-green-200 ring-2 ring-green-300 transition shadow-sm"
              title="Go back"
            >
              <ArrowLeft className="w-5 h-5 text-green-700" />
            </button>
            <MessageSquare className="w-6 h-6 text-purple-600" />
            <h2 className="text-xl text-gray-900">Defaulter EMAILS</h2>
            <a href="">
              <img
                width="30"
                height="30"
                src="https://img.icons8.com/offices/30/info.png"
                alt="info"
              />
            </a>
          </div>
          <span className="px-4 py-1.5 bg-purple-100 text-purple-700 rounded-full">
            {count} defaulters
          </span>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
                <th className="px-6 py-4 text-left">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>CREATED AT</span>
                  </div>
                </th>
                <th className="px-6 py-4 text-left">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    <span>CONTACT</span>
                  </div>
                </th>
                <th className="px-6 py-4 text-left">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    <span>STAGE</span>
                  </div>
                </th>
                <th className="px-6 py-4 text-left">
                  <div className="flex items-center gap-2">
                    <BarChart className="w-4 h-4" />
                    <span>EMAIL ADDRESS</span>
                  </div>
                </th>
              </tr>
            </thead>

            <tbody>
              {Array.isArray(detection) &&
                detection.map((email, index) => (
                  <tr
                    key={index}
                    className="border-b border-gray-100 hover:bg-purple-50 transition-colors cursor-pointer"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-gray-600">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span>{email.date_entered}</span>
                      </div>
                    </td>

                    <td className="px-6 py-4 text-gray-900">
                      {email.first_name || "Unknown"}
                    </td>

                    <td
                      onClick={() => handleMove({ email: email.from, threadId: email.thread_id })
                      }
                      className="px-6 py-4 text-purple-600"
                    >
                      {email.stage}
                    </td>

                    <td className="px-6 py-4 text-purple-600">
                      {email.email_address}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {detection?.length > 0 && (
          <Pagination slice={"contactdefaulter"} fn={getContactDefaulters} />
        )}

        {detection.length === 0 && (
          <div className="p-12 text-center">
            <EqualApproximatelyIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No defaulter emails yet.</p>
          </div>
        )}
      </div>
    </>
  );
}
