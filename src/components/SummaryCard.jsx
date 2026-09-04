import React from "react";

const SummaryCard = ({
    type,
    data = [],
    websiteKey,
    amountKey,
    children, // 🔥 buttons will come from here
}) => {
    return (
        <div className="w-full lg:w-80 shrink-0">
            <div className="sticky top-6 bg-white rounded-2xl border border-gray-200 shadow-lg p-6">

                {/* 🔥 HEADER */}
                <h3 className="font-semibold text-lg text-gray-800 mb-4">
                    {type?.charAt(0).toUpperCase() + type?.slice(1)} Summary
                </h3>

                {/* 🔥 SUMMARY */}
                <div className="space-y-4 text-sm">
                    <div className="flex justify-between py-2 border-b">
                        <span className="text-gray-600">Total {type}:</span>
                        <strong className="text-gray-900">{data.length}</strong>
                    </div>

                    <div>
                        <strong className="block mb-2 text-gray-700">
                            Websites
                        </strong>

                        {data.length === 0 ? (
                            <p className="text-gray-400 text-sm italic">
                                None added yet
                            </p>
                        ) : (
                            <ul className="space-y-2 text-sm">
                                {data.map((d, i) => (
                                    <li
                                        key={i}
                                        className="flex justify-between items-center"
                                    >
                                        <span className="text-gray-700 truncate max-w-[180px]">
                                            {d[websiteKey] || "—"}
                                        </span>

                                        {amountKey && (
                                            <strong className="text-emerald-600">
                                                $
                                                {Number(d[amountKey])
                                                    ? Number(d[amountKey]).toLocaleString()
                                                    : "0"}
                                            </strong>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>

                {/* 🔥 ACTIONS VIA CHILDREN */}
                {children && (
                    <div className="mt-6 flex gap-3">
                        {children}
                    </div>
                )}
            </div>
        </div>
    );
};

export default SummaryCard;