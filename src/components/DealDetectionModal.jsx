import React, { useEffect, useMemo, useState } from "react";
import {
    X,
    Handshake,
    Globe,
    DollarSign,
    Copy,
    ExternalLink,
    Save,
    Send,
} from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";

import IconButton from "./ui/Buttons/IconButton";

import { useContact } from "../queries/contact.queries";
import { useTemplateByName } from "../queries/template.queries";
import { useThreadContext } from "../hooks/useThreadContext";

import { buildTable } from "./Preview";

import {
    createDeal,
    dealsAction,
} from "../store/Slices/deals";

import { dealKeys } from "../queries/deals.queries";
import { offerKeys } from "../queries/offers.queries";

import { queryClient } from "../lib/queryClient";

const DealDetectionModal = ({
    open,
    email,
    threadId,
    data,
    onClose,
}) => {
    const dispatch = useDispatch();

    const { creating, message, error } = useSelector(
        (state) => state.deals
    );

    const { data: contactData } = useContact(email);

    const { data: templateData } =
        useTemplateByName("DealORG");

    const { handleMove } = useThreadContext();
    const contactId = contactData?.contact?.id;

    const [send, setSend] = useState(false);

    /**
     * -----------------------------------------
     * Convert AI Response into Deal Structure
     * -----------------------------------------
     */

    const [deals, setDeals] = useState([]);

    useEffect(() => {
        setDeals(
            data?.websites?.map((site) => ({
                website_c: site.name,
                dealamount: site.amount,
            })) || []
        );
    }, [data]);
    const handleAmountChange = (index, value) => {
        setDeals((prev) =>
            prev.map((deal, i) =>
                i === index
                    ? {
                        ...deal,
                        dealamount: value,
                    }
                    : deal
            )
        );
    };
    /**
     * -----------------------------------------
     * Copy Website
     * -----------------------------------------
     */

    const copyWebsite = async (website) => {
        try {
            await navigator.clipboard.writeText(website);

            toast.success("Website copied.");
        } catch {
            toast.error("Unable to copy website.");
        }
    };

    /**
     * -----------------------------------------
     * Create Preview
     * -----------------------------------------
     */

    const handlePreview = () => {
        let html = templateData?.[0]?.body_html || "";

        const tableHtml = buildTable(
            deals,
            "Deals",
            "website_c",
            "dealamount"
        );

        html = html
            .replace("{{USER_EMAIL}}", email)
            .replace("{{TABLE}}", tableHtml);

        handleMove({
            email,
            threadId,
            reply: html,
        });
    };

    /**
     * -----------------------------------------
     * Save Deal
     * -----------------------------------------
     */

    const handleSave = (isSend = false) => {
        setSend(isSend);

        dispatch(
            createDeal({
                threadId,
                email,
                contactId,
                deals,
                isSend,
            })
        );
    };

    /**
     * -----------------------------------------
     * Success / Error Handling
     * -----------------------------------------
     */

    useEffect(() => {
        if (!message && !error) return;

        if (message) {
            toast.success(message);

            queryClient.invalidateQueries({
                queryKey: dealKeys.all,
            });

            queryClient.invalidateQueries({
                queryKey: offerKeys.all,
            });

            if (message.includes("Created")) {
                dispatch(dealsAction.clearAllMessages());

                if (send) {
                    setSend(false);

                    onClose?.();

                    handlePreview();
                } else {
                    setSend(false);

                    onClose?.();
                }
            }
        }

        if (error) {
            toast.error(error);

            setSend(false);

            dispatch(dealsAction.clearAllErrors());
        }
    }, [message, error]);

    if (!open) return null;
    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl">

                {/* ================= HEADER ================= */}

                <div className="flex items-start justify-between border-b px-6 py-5">
                    <div className="flex items-center gap-4">

                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100">
                            <Handshake className="h-6 w-6 text-blue-600" />
                        </div>

                        <div>
                            <h2 className="text-xl font-semibold text-gray-900">
                                Potential Deal Found
                            </h2>

                            <p className="mt-1 text-sm text-gray-500">
                                AI analyzed this email and detected{" "}
                                <span className="font-semibold text-blue-600">
                                    {deals.length}
                                </span>{" "}
                                potential deal
                                {deals.length > 1 ? "s" : ""}.
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="rounded-lg p-2 transition hover:bg-gray-100"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* ================= BODY ================= */}

                <div className="max-h-[65vh] space-y-5 overflow-y-auto p-6">

                    {deals.length === 0 && (
                        <div className="py-16 text-center">

                            <Handshake
                                size={56}
                                className="mx-auto mb-5 text-gray-300"
                            />

                            <h3 className="text-lg font-semibold">
                                No Deal Found
                            </h3>

                            <p className="mt-2 text-sm text-gray-500">
                                AI couldn't detect any valid deal from this email.
                            </p>

                        </div>
                    )}

                    {deals.map((deal, index) => {

                        const reason = data?.reason?.[index]?.reason;

                        return (
                            <div
                                key={index}
                                className="overflow-hidden rounded-2xl border border-gray-200 bg-gray-50 shadow-sm"
                            >

                                {/* Card Header */}

                                <div className="border-b bg-white px-5 py-3">

                                    <div className="flex items-center justify-between">

                                        <div className="flex items-center gap-2">

                                            <Handshake
                                                size={18}
                                                className="text-blue-600"
                                            />

                                            <h3 className="font-semibold text-gray-800">
                                                Deal #{index + 1}
                                            </h3>

                                        </div>

                                        <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                                            AI Detected
                                        </span>

                                    </div>

                                </div>

                                {/* Card Body */}

                                <div className="space-y-6 p-5">

                                    {/* Website */}

                                    <div>

                                        <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-700">

                                            <Globe size={16} />

                                            Website

                                        </label>

                                        <div className="flex items-center justify-between rounded-xl border bg-white px-4 py-3">

                                            <a
                                                href={deal.website_c}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="truncate text-blue-600 hover:underline"
                                            >
                                                {deal.website_c}
                                            </a>

                                            <div className="flex gap-2">

                                                <button
                                                    onClick={() =>
                                                        copyWebsite(deal.website_c)
                                                    }
                                                    className="rounded-lg p-2 transition hover:bg-gray-100"
                                                >
                                                    <Copy size={16} />
                                                </button>

                                                <a
                                                    href={deal.website_c}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="rounded-lg p-2 transition hover:bg-gray-100"
                                                >
                                                    <ExternalLink size={16} />
                                                </a>

                                            </div>

                                        </div>

                                    </div>

                                    {/* Amount */}

                                    <div>

                                        <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-700">

                                            <DollarSign size={16} />

                                            Deal Amount

                                        </label>

                                        <div className="rounded-xl border bg-white px-4 py-3">
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={deal.dealamount}
                                                onChange={(e) =>
                                                    handleAmountChange(index, e.target.value)
                                                }
                                                className="w-full bg-transparent text-2xl font-bold text-emerald-600 outline-none"
                                                placeholder="Enter amount"
                                            />
                                        </div>

                                    </div>

                                    {/* AI Reason */}

                                    {reason && (

                                        <div>

                                            <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-700">

                                                <Handshake size={16} />

                                                AI Analysis

                                            </label>

                                            <div className="rounded-xl border bg-white p-4 text-sm leading-7 text-gray-600">

                                                {reason}

                                            </div>

                                        </div>

                                    )}

                                </div>

                            </div>
                        );
                    })}
                </div>

                {/* ================= FOOTER ================= */}

                <div className="flex items-center justify-between border-t bg-gray-50 px-6 py-5">

                    <button
                        onClick={onClose}
                        className="rounded-lg border border-gray-300 bg-white px-5 py-2 font-medium transition hover:bg-gray-100"
                    >
                        Cancel
                    </button>

                    <div className="flex gap-3">

                        <IconButton
                            icon={Save}
                            label="Create Deal"
                            loading={creating && !send}
                            disabled={!deals.length}
                            onClick={() => handleSave(false)}
                        />

                        <IconButton
                            icon={Send}
                            label="Create & Send"
                            loading={creating && send}
                            disabled={!deals.length}
                            onClick={() => handleSave(true)}
                        />

                    </div>

                </div>

            </div>
        </div>
    )
};
export default DealDetectionModal;