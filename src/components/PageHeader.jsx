import React from "react";
import { ArrowLeft, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";

const PageHeader = ({
    title,
    onAdd,
    showAdd = true,
    back = true,
}) => {
    const navigate = useNavigate();

    return (
        <div className="flex items-center justify-between mb-6">

            {/* 🔙 LEFT SIDE */}
            <div className="flex items-center gap-3">
                {back && (
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 rounded-lg hover:bg-gray-100 transition curso"
                    >
                        <ArrowLeft className="w-5 h-5 text-gray-700" />
                    </button>
                )}

                <h2 className="text-xl font-semibold text-gray-800">
                    {title}
                </h2>
            </div>

            {/* ➕ RIGHT SIDE */}
            {showAdd && (
                <button
                    onClick={onAdd}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 transition cursor-pointer"
                >
                    <Plus className="w-4 h-4" />
                </button>
            )}
        </div>
    );
};

export default PageHeader;