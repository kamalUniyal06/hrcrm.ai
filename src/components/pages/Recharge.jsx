import { useEffect, useState } from "react";
import {
    PayPalButtons,
    PayPalScriptProvider,
} from "@paypal/react-paypal-js";
import { useSearchParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
    ShieldCheck,
    Lock,
    CreditCard,
    Wallet,
    CheckCircle2,
    Mail,
    Building2,
    BadgeCheck,
    Sparkles,
} from "lucide-react";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getPaypalKey } from "../../api/billings.api";
import toast from "react-hot-toast";
import { getUser } from "../../store/Slices/userSlice";
import { queryClient } from "../../lib/queryClient";
import { usePlans } from "../../queries/billings.queries";
const PaypalButtonSkeleton = () => (
    <div className="animate-pulse">

        <div className="h-[52px] w-full rounded-full bg-gradient-to-r from-yellow-200 via-yellow-100 to-yellow-200" />

        <div className="mt-4 space-y-3">

            <div className="h-4 rounded bg-slate-200" />

            <div className="h-4 w-3/4 rounded bg-slate-200" />

        </div>

    </div>
);
export default function Recharge() {
    const [searchParams] = useSearchParams();
    const dispatch = useDispatch()
    const navigate = useNavigate();
    const { data, isLoading, } = useQuery({ queryKey: ['paypal-key'], queryFn: () => getPaypalKey() })
    const planId = searchParams.get("plan_id")
    const { data: plansData, isPending: isLoadingPlans } = usePlans()
    const planDetails = plansData?.records?.find(plan => plan.id == planId)
    const amount = planDetails?.amount
    const CLIENT_ID = data?.records?.[0]?.production_first_token;
    const { user: { email }, businessEmail } = useSelector((state) => state.user);

    useEffect(() => {
        if (!planId) {
            toast.error("Please select a plan");
            navigate("/settings/billing");
        }
        if (!isLoadingPlans && !planDetails) {
            toast.error("Please select a valid Plan");
            navigate("/settings/billing");
        }
    }, [planId, isLoadingPlans, planDetails, navigate]);
    const createOrder = async () => {
        const response = await fetch(
            `https://crm.outrightsystems.org/index.php?entryPoint=get_invoice&type=create&email=${encodeURIComponent(
                email
            )}&amount=${encodeURIComponent(
                amount
            )}&plan_id=${encodeURIComponent(
                planId
            )}&bussiness_email=${encodeURIComponent(
                businessEmail
            )}`
        );

        const text = await response.text();

        console.log(text);

        const data = JSON.parse(text);

        return data.orderID;
    };

    const onApprove = async (data) => {
        const loadingToast = toast.loading("Verifying your payment...");

        try {
            const response = await fetch(
                `https://crm.outrightsystems.org/index.php?entryPoint=get_invoice&type=capture&orderID=${data.orderID}`
            );

            const text = await response.text();

            toast.dismiss(loadingToast);
            toast.success(
                "Payment Successful!\nYour wallet has been recharged successfully.",
                {
                    duration: 3500,
                }
            );

            setTimeout(() => {
                dispatch(getUser())
                queryClient.invalidateQueries({
                    queryKey: ["billing"],
                })
                navigate("/");
            }, 1800);
        } catch (error) {
            console.error(error);

            toast.dismiss(loadingToast);

            toast.error(
                "Payment was completed but we couldn't verify it. Please contact support if your wallet is not updated.",
                {
                    duration: 5000,
                }
            );
        }
    };
    return (

        <div className="min-h-screen bg-slate-100 py-5 px-10">

            <div className="mx-auto max-w-7xl">

                {/* Header */}

                <div className="mb-8 flex items-center justify-between">

                    <div className="flex items-center gap-4">

                        <button
                            onClick={() => navigate(-1)}
                            className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white shadow-sm transition hover:bg-slate-100"
                        >
                            <ArrowLeft size={20} />
                        </button>

                        <div>

                            <h1 className="text-4xl font-bold text-slate-900">
                                Recharge Wallet
                            </h1>

                            <p className="mt-1 text-slate-500">
                                Add balance securely using PayPal.
                            </p>

                        </div>

                    </div>

                    <div className="hidden md:inline-flex items-center gap-2 rounded-full bg-blue-100 px-4 py-2 text-sm font-semibold text-blue-700">

                        <Sparkles size={16} />

                        Secure Checkout

                    </div>

                </div>

                {/* Main Card */}

                <div className="grid lg:grid-cols-5 overflow-hidden rounded-3xl bg-white shadow-2xl border border-slate-200">

                    {/* LEFT */}

                    <div className="lg:col-span-2 bg-slate-900 text-white p-10 flex flex-col">

                        <div>

                            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2">

                                <Wallet size={16} />

                                Order Summary

                            </div>

                            <h2 className="mt-6 text-3xl font-bold">

                                Wallet Recharge

                            </h2>

                            <p className="mt-2 text-slate-400">

                                Review your payment before checkout.

                            </p>

                        </div>

                        <div className="mt-10 rounded-3xl bg-white/5 border border-white/10 p-6 space-y-5">

                            <div className="flex justify-between">

                                <span className="text-slate-400">

                                    Recharge Amount

                                </span>

                                <span className="font-semibold">

                                    ${Number(amount || 0).toFixed(2)}

                                </span>

                            </div>

                            <div className="flex justify-between">

                                <span className="text-slate-400">

                                    Processing Fee

                                </span>

                                <span className="font-semibold text-green-400">

                                    Free

                                </span>

                            </div>

                            <div className="flex justify-between">

                                <span className="text-slate-400">

                                    Tax

                                </span>

                                <span>

                                    $0.00

                                </span>

                            </div>

                            <div className="border-t border-white/10 pt-5 flex justify-between items-center">

                                <span className="text-lg font-semibold">

                                    Total

                                </span>

                                <span className="text-4xl font-bold text-green-400">

                                    ${Number(amount || 0).toFixed(2)}

                                </span>

                            </div>

                        </div>

                        <div className="mt-8 rounded-3xl bg-blue-600 p-6">

                            <div className="flex items-center gap-3">

                                <ShieldCheck size={30} />

                                <div>

                                    <h3 className="font-semibold text-lg">

                                        Secure Payment

                                    </h3>

                                    <p className="text-sm text-blue-100">

                                        Transactions are processed securely
                                        by PayPal with industry-standard
                                        encryption.

                                    </p>

                                </div>

                            </div>

                        </div>

                        <div className="mt-8 space-y-4">

                            <div className="flex items-center gap-3">

                                <CheckCircle2
                                    className="text-green-400"
                                    size={20}
                                />

                                <span>

                                    256-bit SSL Encryption

                                </span>

                            </div>

                            <div className="flex items-center gap-3">

                                <CheckCircle2
                                    className="text-green-400"
                                    size={20}
                                />

                                <span>

                                    Instant Wallet Recharge

                                </span>

                            </div>

                            <div className="flex items-center gap-3">

                                <CheckCircle2
                                    className="text-green-400"
                                    size={20}
                                />

                                <span>

                                    No Hidden Charges

                                </span>

                            </div>

                            <div className="flex items-center gap-3">

                                <CheckCircle2
                                    className="text-green-400"
                                    size={20}
                                />

                                <span>

                                    Powered by PayPal

                                </span>

                            </div>

                        </div>

                        <div className="mt-auto pt-10 border-t border-white/10">

                            <div className="flex items-center gap-3">

                                <Lock className="text-green-400" />

                                <p className="text-sm text-slate-300">

                                    Your payment information is encrypted
                                    and never stored on our servers.

                                </p>

                            </div>

                        </div>

                    </div>
                    {/* RIGHT PANEL */}
                    <div className="lg:col-span-3 p-10">

                        <h2 className="text-2xl font-bold text-slate-900">

                            Payment Details

                        </h2>

                        <p className="mt-2 text-slate-500">

                            Review your information before completing
                            payment.

                        </p>

                        <div className="mt-10 space-y-7">

                            {/* Email */}

                            <div>

                                <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-600">

                                    <Mail size={16} />

                                    Email Address

                                </label>

                                <input
                                    readOnly
                                    value={email}
                                    className="h-14 w-full rounded-2xl border bg-slate-50 px-5 outline-none"
                                />

                            </div>

                            {/* Business */}

                            <div>

                                <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-600">

                                    <Building2 size={16} />

                                    Business Email

                                </label>

                                <input
                                    readOnly
                                    value={businessEmail}
                                    className="h-14 w-full rounded-2xl border bg-slate-50 px-5 outline-none"
                                />

                            </div>



                            {/* Payment Box */}

                            <div className="rounded-3xl border bg-slate-50 p-6">

                                <div className="mb-5 flex items-center gap-3">

                                    <CreditCard
                                        className="text-blue-600"
                                        size={22}
                                    />

                                    <div>

                                        <h3 className="font-semibold text-lg">

                                            Complete Payment

                                        </h3>

                                        <p className="text-sm text-slate-500">

                                            Pay securely using your PayPal
                                            account.

                                        </p>

                                    </div>

                                </div>
                                {isLoading || isLoadingPlans || !CLIENT_ID ? (
                                    <PaypalButtonSkeleton />
                                ) : (
                                    <PayPalScriptProvider
                                        options={{
                                            clientId: CLIENT_ID,
                                            currency: "USD",
                                        }}
                                    >
                                        <PayPalButtons
                                            forceReRender={[amount]}
                                            style={{
                                                layout: "vertical",
                                                shape: "pill",
                                                color: "gold",
                                                label: "paypal",
                                                height: 52,
                                            }}
                                            createOrder={createOrder}
                                            onApprove={onApprove}
                                            onError={(err) => {
                                                console.error(err);
                                                alert("Payment Failed");
                                            }}
                                        />
                                    </PayPalScriptProvider>)}

                            </div>

                            {/* Security Features */}

                            <div className="grid gap-4 md:grid-cols-3">

                                <div className="rounded-2xl border bg-white p-5">

                                    <Lock
                                        className="mb-3 text-green-600"
                                        size={26}
                                    />

                                    <h4 className="font-semibold">

                                        SSL Encrypted

                                    </h4>

                                    <p className="mt-2 text-sm text-slate-500">

                                        Every payment is protected with
                                        enterprise-grade encryption.

                                    </p>

                                </div>

                                <div className="rounded-2xl border bg-white p-5">

                                    <ShieldCheck
                                        className="mb-3 text-blue-600"
                                        size={26}
                                    />

                                    <h4 className="font-semibold">

                                        Buyer Protection

                                    </h4>

                                    <p className="mt-2 text-sm text-slate-500">

                                        Eligible purchases are protected by
                                        PayPal.

                                    </p>

                                </div>

                                <div className="rounded-2xl border bg-white p-5">

                                    <CheckCircle2
                                        className="mb-3 text-purple-600"
                                        size={26}
                                    />

                                    <h4 className="font-semibold">

                                        Instant Credit

                                    </h4>

                                    <p className="mt-2 text-sm text-slate-500">

                                        Wallet balance is updated
                                        immediately after successful
                                        payment.

                                    </p>

                                </div>

                            </div>

                        </div>

                    </div>




                </div>

            </div>

        </div>


    );

}