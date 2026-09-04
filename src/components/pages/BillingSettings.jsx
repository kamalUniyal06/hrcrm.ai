import { useState } from "react";
import {
    CreditCard,
    History,
    Wallet,
    BarChart3,
} from "lucide-react";

import PlansPage from "./PlansPage";
import { useNavigate, useParams } from "react-router-dom";
import { BillingHistory } from "./BillingHistory";
import { AiCreditsPage } from "./AiCreditsPage";


export default function BillingSettings() {
    const { tab } = useParams();
    const navigate = useNavigate();

    const activeTab = tab || "plans";

    const tabs = [
        {
            id: "plans",
            label: "Plans",
            icon: CreditCard,
        },
        {
            id: "history",
            label: "Billing History",
            icon: History,
        },
        {
            id: "usage",
            label: "Credit Usage",
            icon: BarChart3,
        },
    ];

    return (
        <div className="p-6">
            <div className="mb-6">
                <h1 className="text-3xl font-bold">
                    Billing
                </h1>

                <p className="mt-2 text-gray-500">
                    Manage your subscription, payments and AI credits.
                </p>
            </div>

            <div className="rounded-xl border bg-white shadow-sm">

                {/* Tabs */}

                <div className="flex border-b">

                    {tabs.map((item) => {
                        const Icon = item.icon;

                        return (
                            <button
                                key={item.id}
                                onClick={() => navigate(`/settings/billing/${item.id}`)}
                                className={`flex items-center gap-2 px-6 py-4 font-medium transition ${activeTab === item.id
                                    ? "border-b-2 border-blue-600 text-blue-600"
                                    : "text-gray-500 hover:text-black"
                                    }`}
                            >
                                <Icon size={18} />
                                {item.label}
                            </button>
                        );
                    })}
                </div>

                {/* Content */}

                <div className="p-6">

                    {activeTab === "plans" && <PlansPage />}

                    {activeTab === "history" && (
                        <BillingHistory />
                    )}


                    {activeTab === "usage" && (
                        <AiCreditsPage />
                    )}

                </div>
            </div>
        </div>
    );
}