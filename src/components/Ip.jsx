import React from "react";
import { useSelector } from "react-redux";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import useModule from "../hooks/useModule";
import { CREATE_DEAL_API_KEY } from "../store/constants";
import {
  Globe,
  Mail,
  CalendarDays,
  Database,
  SearchX,
  ArrowLeft,
} from "lucide-react";

const Ip = () => {
  const navigate = useNavigate();

  const { crmEndpoint } = useSelector((state) => state.user);
  const { contactInfo } = useSelector((state) => state.viewEmail);

  const email = contactInfo?.email1;

  const { loading, data } = useModule({
    url: `${crmEndpoint.split("?")[0]}?entryPoint=get_post_all&action_type=get_data`,
    method: "POST",
    body: {
      module: "outr_crm_ip_tracker",
      where: { email },
    },
    headers: {
      "x-api-key": CREATE_DEAL_API_KEY,
      "Content-Type": "application/json",
    },
    name: `IP OF EMAIL ${email}`,
  });

  const records = Array.isArray(data) ? data : [];
  const noData = !loading && records.length === 0;

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-8">
      {/* BACK BUTTON */}
      <button
        onClick={() => navigate(-1)}
        className="mb-6 flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 shadow-sm hover:bg-slate-100 transition"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      {/* HEADER */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">
          IP Tracking Logs
        </h1>
        <p className="text-slate-500 mt-1">
          Track email access activity and IP records
        </p>
      </div>

      {/* SUMMARY CARD */}
      {!loading && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm mb-8">
          <div className="grid md:grid-cols-2 gap-5">
            <div>
              <p className="text-sm text-slate-500 mb-1">Tracked Email</p>
              <div className="flex items-center gap-2 text-slate-800 font-semibold break-all">
                <Mail className="w-4 h-4" />
                {email || "N/A"}
              </div>
            </div>

            <div>
              <p className="text-sm text-slate-500 mb-1">Total Records</p>
              <div className="flex items-center gap-2 text-slate-800 font-semibold">
                <Database className="w-4 h-4" />
                {records.length}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* LOADING */}
      {loading && (
        <div className="space-y-4">
          {[1, 2, 3, 4].map((item) => (
            <div
              key={item}
              className="bg-white rounded-2xl border border-slate-200 p-5 animate-pulse"
            >
              <div className="h-4 w-40 bg-slate-200 rounded mb-3"></div>
              <div className="h-4 w-64 bg-slate-200 rounded mb-2"></div>
              <div className="h-4 w-52 bg-slate-200 rounded"></div>
            </div>
          ))}
        </div>
      )}

      {/* EMPTY STATE */}
      {noData && (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm">
          <SearchX className="w-14 h-14 mx-auto text-slate-400 mb-4" />
          <h2 className="text-xl font-semibold text-slate-800">
            No Records Found
          </h2>
          <p className="text-slate-500 mt-2">
            This email has no tracked IP activity yet.
          </p>
        </div>
      )}

      {/* DATA LIST */}
      {!loading && !noData && (
        <div className="space-y-4">
          {records.map((item, index) => (
            <motion.div
              key={item.id || index}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: index * 0.03 }}
              className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition"
            >
              <div className="grid md:grid-cols-3 gap-5">
                {/* IP */}
                <div>
                  <p className="text-xs text-slate-500 mb-1">IP Address</p>
                  <div className="flex items-center gap-2 text-slate-900 font-semibold">
                    <Globe className="w-4 h-4 text-blue-600" />
                    {item.name}
                  </div>
                </div>

                {/* EMAIL */}
                <div>
                  <p className="text-xs text-slate-500 mb-1">Email</p>
                  <div className="flex items-center gap-2 text-slate-800 break-all">
                    <Mail className="w-4 h-4 text-emerald-600" />
                    {item.email}
                  </div>
                </div>

                {/* DATE */}
                <div>
                  <p className="text-xs text-slate-500 mb-1">Tracked At</p>
                  <div className="flex items-center gap-2 text-slate-800">
                    <CalendarDays className="w-4 h-4 text-orange-600" />
                    {new Date(item.date_entered).toLocaleString()}
                  </div>
                </div>
              </div>

              {/* DESCRIPTION */}
              {item.description && (
                <div className="mt-4 pt-4 border-t border-slate-100 text-sm text-slate-600">
                  {item.description}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Ip;