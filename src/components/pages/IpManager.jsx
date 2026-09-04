import React, { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { motion } from "framer-motion";
import {
    Search,
    Mail,
    Globe,
    CalendarDays,
    Database,
    Filter,
    ArrowLeft,
} from "lucide-react";
import useModule from "../../hooks/useModule";
import { CREATE_DEAL_API_KEY } from "../../store/constants";
import { useNavigate } from "react-router-dom";

const IpManager = () => {
    const { crmEndpoint } = useSelector((state) => state.user);
    const navigate = useNavigate()
    const [emailSearch, setEmailSearch] = useState("");
    const [ipSearch, setIpSearch] = useState("");

    // ==========================
    // DEBOUNCED STATES
    // ==========================
    const [debouncedEmail, setDebouncedEmail] = useState("");
    const [debouncedIp, setDebouncedIp] = useState("");

    // ==========================
    // EMAIL DEBOUNCE
    // ==========================
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedEmail(emailSearch);
        }, 500);

        return () => clearTimeout(timer);
    }, [emailSearch]);

    // ==========================
    // IP DEBOUNCE
    // ==========================
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedIp(ipSearch);
        }, 500);

        return () => clearTimeout(timer);
    }, [ipSearch]);

    // ==========================
    // WHERE OBJECT
    // ==========================
    const where = useMemo(() => {
        const obj = {};

        if (debouncedEmail.trim()) {
            obj.email = debouncedEmail.trim();
        }

        if (debouncedIp.trim()) {
            obj.name = debouncedIp.trim();
        }

        return obj;
    }, [debouncedEmail, debouncedIp]);

    // ==========================
    // API CALL
    // ==========================
    const { loading, data } = useModule({
        url: `${crmEndpoint.split("?")[0]}?entryPoint=get_post_all&action_type=get_data`,
        method: "POST",
        body: {
            module: "outr_crm_ip_tracker",
            where,
        },
        headers: {
            "x-api-key": CREATE_DEAL_API_KEY,
            "Content-Type": "application/json",
        },
        name: "ALL IP TRACKER DATA",
        dependencies: [where],
    });

    const records = Array.isArray(data) ? data : [];
    const noData = !loading && records.length === 0;

    return (
        <div className="min-h-screen bg-slate-50 p-6 md:p-8">
            {/* HEADER */}
            <button
                onClick={() => navigate(-1)}
                className="mb-6 flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 shadow-sm hover:bg-slate-100 transition"
            >
                <ArrowLeft className="w-4 h-4" />
                Back
            </button>
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-900">IP Manager</h1>
                <p className="text-slate-500 mt-1">
                    Search and manage tracked IP records
                </p>
            </div>

            {/* SEARCH AREA */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm mb-8">
                <div className="grid md:grid-cols-2 gap-4">
                    {/* EMAIL SEARCH */}
                    <div>
                        <label className="text-sm font-medium text-slate-700 mb-2 block">
                            Search By Email
                        </label>

                        <div className="relative">
                            <Mail className="w-4 h-4 absolute left-3 top-3.5 text-slate-400" />

                            <input
                                type="text"
                                value={emailSearch}
                                onChange={(e) => setEmailSearch(e.target.value)}
                                placeholder="Enter email..."
                                className="w-full border border-slate-200 rounded-xl pl-10 pr-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    {/* IP SEARCH */}
                    <div>
                        <label className="text-sm font-medium text-slate-700 mb-2 block">
                            Search By IP Address
                        </label>

                        <div className="relative">
                            <Globe className="w-4 h-4 absolute left-3 top-3.5 text-slate-400" />

                            <input
                                type="text"
                                value={ipSearch}
                                onChange={(e) => setIpSearch(e.target.value)}
                                placeholder="Enter IP..."
                                className="w-full border border-slate-200 rounded-xl pl-10 pr-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>
                </div>

                {/* ACTIVE FILTERS */}
                <div className="mt-5 flex flex-wrap gap-3">
                    {debouncedEmail && (
                        <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm">
                            Email: {debouncedEmail}
                        </span>
                    )}

                    {debouncedIp && (
                        <span className="px-3 py-1 bg-green-50 text-green-700 rounded-full text-sm">
                            IP: {debouncedIp}
                        </span>
                    )}

                    {!debouncedEmail && !debouncedIp && (
                        <span className="text-slate-500 text-sm flex items-center gap-2">
                            <Filter className="w-4 h-4" />
                            Showing all records
                        </span>
                    )}
                </div>
            </div>

            {/* SUMMARY */}
            {!loading && (
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm mb-8">
                    <div className="flex items-center gap-2 text-slate-800 font-semibold">
                        <Database className="w-5 h-5" />
                        Total Records: {records.length}
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
                            <div className="h-4 w-48 bg-slate-200 rounded mb-3"></div>
                            <div className="h-4 w-72 bg-slate-200 rounded mb-2"></div>
                            <div className="h-4 w-56 bg-slate-200 rounded"></div>
                        </div>
                    ))}
                </div>
            )}

            {/* EMPTY */}
            {noData && (
                <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
                    <Search className="w-12 h-12 mx-auto text-slate-400 mb-4" />
                    <h2 className="text-xl font-semibold text-slate-800">
                        No Records Found
                    </h2>
                    <p className="text-slate-500 mt-2">
                        Try another email or IP address.
                    </p>
                </div>
            )}

            {/* DATA */}
            {!loading && !noData && (
                <div className="space-y-4">
                    {records.map((item, index) => (
                        <motion.div
                            key={item.id || index}
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{
                                duration: 0.25,
                                delay: index * 0.03,
                            }}
                            className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition"
                        >
                            <div className="grid md:grid-cols-3 gap-5">
                                <div>
                                    <p className="text-xs text-slate-500 mb-1">IP Address</p>
                                    <p className="font-semibold text-slate-900">{item.name}</p>
                                </div>

                                <div>
                                    <p className="text-xs text-slate-500 mb-1">Email</p>
                                    <p className="text-slate-800 break-all">{item.email}</p>
                                </div>

                                <div>
                                    <p className="text-xs text-slate-500 mb-1">Date</p>
                                    <div className="flex items-center gap-2 text-slate-800">
                                        <CalendarDays className="w-4 h-4 text-orange-500" />
                                        {new Date(item.date_entered).toLocaleString()}
                                    </div>
                                </div>
                            </div>

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

export default IpManager;