import { useEffect, useState } from "react";
import useModule from "../hooks/useModule";
import Loading from "./Loading";
import { useSelector } from "react-redux";
import { CREATE_DEAL_API_KEY } from "../store/constants";
import { excludeName } from "../assets/assets";

/* helper (keep if already exists globally) */
const base64ToUtf8 = (str) => {
    try {
        return decodeURIComponent(
            atob(str)
                .split("")
                .map(c => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
                .join("")
        );
    } catch {
        return "";
    }
};

export const ViewReminder = ({ reminder, onSend, loading, onClose }) => {
    const { crmEndpoint } = useSelector((state) => state.user);

    const [templateContent, setTemplateContent] = useState(null);
    const [showPreview, setShowPreview] = useState(false);

    const { loading: templateLoading, data: template } = useModule({
        url: `${crmEndpoint.split("?")[0]}?entryPoint=get_post_all&action_type=get_data`,
        method: "POST",
        body: {
            module: "EmailTemplates",
            where: { id: reminder?.template_id },
        },
        headers: {
            "x-api-key": CREATE_DEAL_API_KEY,
            "Content-Type": "application/json",
        },
        name: `TEMPLATE WITH ID ${reminder?.template_id}`,
        dependencies: [reminder?.template_id],
        enabled: !!reminder?.template_id,
    });

    useEffect(() => {
        if (template?.length) {
            const html =
                template[0]?.body_html ||
                base64ToUtf8(template[0]?.html_base64);
            setTemplateContent(html);
        }
    }, [template]);


    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-white w-full max-w-3xl mx-4 rounded-xl shadow-xl max-h-[90vh] overflow-hidden animate-fadeIn">

                {/* Header */}
                <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
                    <h2 className="text-lg font-semibold text-gray-800">
                        Reminder Details
                    </h2>

                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-700 text-xl font-bold"
                    >
                        ✕
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto max-h-[calc(90vh-64px)]">
                    {loading ? (
                        <Loading />
                    ) : (
                        <>
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h1 className="text-xl font-semibold text-gray-800">
                                        {reminder?.name}
                                    </h1>
                                    <p className="text-sm text-gray-500 mt-1">
                                        Reminder Type: {reminder?.reminder_type_label}
                                    </p>
                                </div>

                                <span
                                    className={`px-3 py-1 rounded-full text-xs font-semibold
                                    ${reminder?.status === "Pending"
                                            ? "bg-yellow-100 text-yellow-700"
                                            : "bg-green-100 text-green-700"
                                        }`}
                                >
                                    {reminder?.status}
                                </span>
                            </div>

                            <div className="border-t my-5" />

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                                <Detail label="Recipient" value={excludeName(reminder?.real_name)} />
                                <Detail label="Recipient Email" value={reminder?.recipient} />
                                <Detail label="Sender" value={reminder?.sender} />
                                <Detail label="Scheduled Time" value={reminder?.scheduled_time} />
                                <Detail label="Created At" value={reminder?.date_entered} />
                                <Detail label="Last Modified" value={reminder?.date_modified_formatted} />
                                <Detail label="Thread ID" value={reminder?.thread_id} mono />
                                <Detail label="Template ID" value={reminder?.template_id} mono />
                            </div>

                            {/* Actions */}
                            <div className="mt-6 flex justify-end">
                                <button
                                    onClick={() => setShowPreview(true)}
                                    className="px-4 py-2 text-sm font-medium rounded-lg
                                               bg-blue-600 text-white hover:bg-blue-700"
                                >
                                    Preview Template
                                </button>
                            </div>
                        </>
                    )}
                </div>

                {/* Template Preview Overlay */}
                {showPreview && (
                    <div className="absolute inset-0 z-50 bg-white flex flex-col">
                        {/* Preview Header */}
                        <div className="p-4 border-b flex justify-between items-center">
                            <h3 className="text-lg font-semibold text-gray-800">
                                Email Template Preview
                            </h3>
                            <button
                                onClick={() => setShowPreview(false)}
                                className="text-gray-400 hover:text-gray-700 text-xl font-bold"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Preview Body */}
                        <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
                            {templateLoading ? (
                                <Loading />
                            ) : (
                                <div
                                    className="bg-white p-4 rounded-lg border shadow-sm text-sm"
                                    dangerouslySetInnerHTML={{
                                        __html: templateContent || "<p>No template found</p>",
                                    }}
                                />
                            )}
                        </div>

                        {/* Preview Footer */}
                        <div className="border-t p-4 flex justify-end gap-3">
                            <button
                                onClick={() => setShowPreview(false)}
                                className="px-4 py-2 text-sm rounded-lg bg-gray-100 hover:bg-gray-200"
                            >
                                Close
                            </button>

                            <button
                                onClick={() => onSend(reminder?.id)}
                                // disabled={sending}
                                className="px-4 py-2 text-sm rounded-lg
                                           bg-green-600 text-white hover:bg-green-700
                                           disabled:opacity-50"
                            >
                                send
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

/* Reusable Detail Component */
const Detail = ({ label, value, mono }) => (
    <div>
        <p className="text-gray-500 mb-1">{label}</p>
        <p
            className={`text-gray-800 font-medium break-all ${mono ? "font-mono text-xs bg-gray-50 p-2 rounded" : ""
                }`}
        >
            {value || "—"}
        </p>
    </div>
);
