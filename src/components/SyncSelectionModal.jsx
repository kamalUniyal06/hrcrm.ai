import { useEffect, useMemo, useState } from "react";
import { Check, X } from "lucide-react";
import useIdle from "../hooks/useIdle.js";
import { useDispatch, useSelector } from "react-redux";
import { createOffer, offersAction } from "../store/Slices/offers.js";
import { createDeal, dealsAction } from "../store/Slices/deals.js";
import { createOrder3, orderAction } from "../store/Slices/orders.js";
import { toast } from "react-toastify";
import PageLoader from "./PageLoader.jsx";

const TYPE_LABELS = {
    deals: "Deals",
    offers: "Offers",
    orders: "Orders",
};

// Truncate long text
const truncateText = (text, max = 35) =>
    text?.length > max ? text.slice(0, max) + "..." : text;

// Generate random amount if null
const getValidAmount = (amount, min = 50, max = 150) => {
    if (amount !== null && amount !== undefined) return Number(amount);
    return Math.floor(Math.random() * (max - min + 1)) + min;
};

const SyncSelectionModal = ({ onClose, data = [], type = "deals" }) => {
    const [selectedIds, setSelectedIds] = useState(new Set());
    const { threadId } = useSelector((state) => state.viewEmail);
    const { email } = useSelector((state) => state.ladger);
    const {
        creating: offerCreating,
        message: offerMessage,
        error: offerError,
    } = useSelector((state) => state.offers);

    const {
        creating: dealCreating,
        message: dealMessage,
        error: dealError,
    } = useSelector((state) => state.deals);

    const {
        creating: orderCreating,
        message: orderMessage,
        error: orderError,
    } = useSelector((state) => state.orders);

    const dispatch = useDispatch();
    useIdle({ idle: false });

    useEffect(() => {
        if (offerMessage) {
            toast.success(offerMessage);
            offersAction.clearAllMessages();
            onClose();
        }

        if (dealMessage) {
            toast.success(dealMessage);
            dealsAction.clearAllMessages();
            onClose();
        }

        if (orderMessage) {
            onClose();
        }

        if (offerError) {
            toast.error(offerError);
            offersAction.clearAllErrors();
            onClose();
        }

        if (dealError) {
            toast.error(dealError);
            dealsAction.clearAllErrors();
            onClose();
        }

        if (orderError) {
            toast.error(orderError);
            orderAction.clearAllErrors();
            onClose();
        }
    }, [
        offerMessage,
        dealMessage,
        orderMessage,
        offerError,
        dealError,
        orderError,
    ]);

    const normalizedData = useMemo(
        () =>
            data.map((item) => ({
                ...item,
                _amount: getValidAmount(item.amount),
            })),
        [data]
    );

    const allSelected =
        selectedIds.size === normalizedData.length && normalizedData.length > 0;

    const toggleSelectAll = () => {
        setSelectedIds(
            allSelected
                ? new Set()
                : new Set(normalizedData.map((item) => item.id))
        );
    };

    const toggleSelect = (id) => {
        setSelectedIds((prev) => {
            const newSet = new Set(prev);
            newSet.has(id) ? newSet.delete(id) : newSet.add(id);
            return newSet;
        });
    };

    const selectedItems = useMemo(
        () => normalizedData.filter((item) => selectedIds.has(item.id)),
        [normalizedData, selectedIds]
    );

    const totalAmount = selectedItems.reduce(
        (sum, item) => sum + item._amount,
        0
    );

    const handleProceed = () => {
        if (type === "offers") {
            dispatch(
                createOffer(
                    threadId,
                    selectedItems.map((item) => ({
                        amount: item.amount,
                        client_offer_c: item.amount,
                        our_offer_c: item.our_offer_c,
                        website: item.website || item.domain || "",
                        email,
                    })),
                    false
                )
            );
        }

        if (type === "deals") {
            dispatch(
                createDeal(
                    threadId,
                    selectedItems.map((item) => ({
                        dealamount: item.amount,
                        website_c: item.website || item.domain || "",
                        email,
                    })),
                    false
                )
            );
        }

        if (type === "orders") {
            dispatch(
                createOrder3(
                    email,
                    selectedItems,
                    false,
                )
            );
        }
    };

    return (
        <>
            {(offerCreating || dealCreating || orderCreating) && <PageLoader />}

            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                <div className="w-full max-w-6xl rounded-2xl bg-white shadow-xl">
                    {/* Header */}
                    <div className="flex items-center justify-between border-b px-6 py-4">
                        <div>
                            <h2 className="text-lg font-semibold">
                                Sync {TYPE_LABELS[type]}
                            </h2>
                            <p className="text-sm text-gray-500">
                                Select {TYPE_LABELS[type].toLowerCase()} to sync
                            </p>
                        </div>
                        <button onClick={onClose} className="text-gray-500 hover:text-black">
                            <X size={20} />
                        </button>
                    </div>

                    {/* Select All */}
                    <div className="flex items-center justify-between px-6 py-3">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={allSelected}
                                onChange={toggleSelectAll}
                                className="h-4 w-4 rounded border-gray-300"
                            />
                            <span className="text-sm font-medium">Select All</span>
                        </label>
                        <span className="text-sm text-gray-500">
                            {selectedIds.size} selected
                        </span>
                    </div>

                    {/* List */}
                    <div className="max-h-[380px] overflow-y-auto px-6">
                        {normalizedData.map((item) => {
                            const checked = selectedIds.has(item.id);

                            return (
                                <div
                                    key={item.id}
                                    onClick={() => toggleSelect(item.id)}
                                    className={`mb-3 rounded-xl border p-4 cursor-pointer transition z-10
                    ${checked
                                            ? "border-blue-500 bg-blue-50"
                                            : "border-gray-200 hover:bg-gray-50"
                                        }`}
                                >
                                    <div className="flex justify-between">
                                        <div className="flex gap-3">
                                            <div
                                                className={`mt-1 flex h-5 w-5 items-center justify-center rounded border
                          ${checked
                                                        ? "border-blue-500 bg-blue-500 text-white"
                                                        : "border-gray-300"
                                                    }`}
                                            >
                                                {checked && <Check size={14} />}
                                            </div>

                                            <div className="flex flex-col justify-center gap-2">
                                                {(type === "deals" || type === "offers" || (type == "orders")) && item.website && (<p className="font-medium text-gray-900"> {item.website} </p>)}

                                                {type === "orders" && item.content_doc && (<a href={item.content_doc} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 underline" onClick={(e) => e.stopPropagation()} > {truncateText(item.content_doc)} </a>)}

                                                {type === "orders" &&
                                                    Array.isArray(item.external_links) &&
                                                    item.external_links.length > 0 && (
                                                        <div
                                                            className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2"
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            {item.external_links.map((link, idx) => (
                                                                <a
                                                                    key={idx}
                                                                    href={link}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="flex items-center gap-2 rounded-lg border bg-gray-50 px-3 py-2 text-xs text-gray-700 hover:bg-blue-50 hover:border-blue-400 transition"
                                                                >
                                                                    <span className="truncate">
                                                                        {truncateText(link, 45)}
                                                                    </span>
                                                                    <span className="ml-auto text-blue-500">
                                                                        ↗
                                                                    </span>
                                                                </a>
                                                            ))}
                                                        </div>
                                                    )}
                                                {item.date && (<p className="mr-2 text-xs text-gray-500"> {item.date} </p>)}
                                            </div>
                                        </div>

                                        <div className="text-sm font-semibold">
                                            ${item._amount}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between border-t px-6 py-4">
                        <div>
                            <p className="text-sm text-gray-500">Total Amount</p>
                            <p className="text-lg font-semibold">${totalAmount}</p>
                        </div>

                        <button
                            onClick={handleProceed}
                            disabled={selectedIds.size === 0}
                            className="rounded-xl bg-blue-600 px-6 py-2 text-white font-medium hover:bg-blue-700 transition disabled:opacity-50"
                        >
                            Proceed & Sync
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
};

export default SyncSelectionModal;