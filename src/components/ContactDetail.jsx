import React, { useContext, useEffect, useState } from "react";
import {
    User,
    Phone,
    Mail,
    MapPin,
    Building2,
    CreditCard,
    X,
    ChartSpline,
    Target,
    DollarSign,
    Clock,
    TrendingUp,
    Hash,
    Globe,
    Calendar,
} from "lucide-react";
import { useDispatch } from "react-redux";
import AccountPage from "../components/pages/AccountPage";
import { LoadingAll } from "./Loading";
import { useContact, useUpdateAccount, useUpdateContact } from "../queries/contact.queries";
import { ContactDetailSkeleton } from "./ContactDetailSkeleton";


export default function ContactDetail({ email }) {
    const { data, isLoading: contactLoading, isFetching: contactFetching } = useContact(email);
    const { mutate: updateContact, isPending: contactUpdateLoading, error: contactError } = useUpdateContact()
    const { mutate: updateAccount, isPending: accountUpdateLoading, error: accountError } = useUpdateAccount()
    const contactInfo = data?.contact
    const accountInfo = data?.account
    const dealInfo = data?.deal_fetch
    const [isEditing, setIsEditing] = useState(false);
    const [isEditingAccount, setIsEditingAccount] = useState(false);
    const [formData, setFormData] = useState({
        contact: {},
        account: {},
        deal: [],
    });
    const [accountShow, setAccountShow] = useState(false);

    const [totalDealCount, setTotalDealCount] = useState(0);
    const [highestDealAmount, setHighestDealAmount] = useState(0);
    const [highestDealIndex, setHighestDealIndex] = useState(-1);
    const [highestDealDate, setHighestDealDate] = useState("N/A");

    const dispatch = useDispatch();

    useEffect(() => {
        let dealsArray = [];

        if (Array.isArray(dealInfo)) {
            dealsArray = dealInfo;
        } else if (dealInfo && typeof dealInfo === "object") {
            if (Array.isArray(dealInfo.deal)) {
                dealsArray = dealInfo.deal;
            } else {
                dealsArray = Object.values(dealInfo).filter(
                    (item) => item && typeof item === "object"
                );
            }
        }

        const newFormData = {
            contact: contactInfo || {},
            account: accountInfo || {},
            deal: dealsArray,
        };

        setFormData(newFormData);
        calculateDealStats(newFormData.deal);
    }, [data]);


    const calculateDealStats = (deals) => {
        if (!Array.isArray(deals) || deals.length === 0) {
            setTotalDealCount(0);
            setHighestDealAmount(0);
            setHighestDealIndex(-1);
            setHighestDealDate("N/A");
            return;
        }

        setTotalDealCount(deals.length);

        let maxAmount = 0;
        let maxIndex = -1;
        let maxDate = "N/A";

        deals.forEach((deal, index) => {
            const amount = parseFloat(deal?.dealamount) || 0;
            if (amount > maxAmount) {
                maxAmount = amount;
                maxIndex = index;
                maxDate = deal.date_entered ? formatDate(deal.date_entered) : "N/A";
            }
        });

        setHighestDealAmount(maxAmount);
        setHighestDealIndex(maxIndex);
        setHighestDealDate(maxDate);
    };

    const formatDate = (dateString) => {
        if (!dateString) return "N/A";

        const dateOnly = dateString.split(" ")[0];

        try {
            const date = new Date(dateOnly);
            if (!isNaN(date.getTime())) {
                return date.toLocaleDateString("en-GB");
            }
            return dateOnly;
        } catch (error) {
            return dateOnly;
        }
    };

    const handleEditClick = () => {
        setIsEditing(true);
    };

    const handleChange = (e, section) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [section]: {
                ...prev[section],
                [name]: value,
            },
        }));
    };

    const handleSaveContact = () => {
        // console.log("formData", formData);
        updateContact({ email, payload: formData.contact, id: formData.contact.id });
        setIsEditing(false);
    };
    const handleSaveAccount = () => {
        // console.log("formData", formData);
        updateAccount({ email, payload: formData.account, id: formData.account?.id });
        setIsEditingAccount(false);
    };

    const handleCancel = () => {
        setIsEditing(false);
        setIsEditingAccount(false);
    };
    if (contactLoading || accountUpdateLoading || contactUpdateLoading) {
        return <ContactDetailSkeleton />;
    }
    if (accountShow) {
        return (
            <AccountPage
                setAccountShow={setAccountShow}
                formData={formData}
                setFormData={setFormData}
                handleSave={handleSaveAccount}
            />
        );
    }

    return (
        <div className="w-full min-h-screen bg-gradient-to-br from-[#faf5ff] via-[#f0f9ff] to-[#fdf2f8] py-12 px-4">
            {/* Hero Section with Avatar */}
            <div className="max-w-7xl mx-auto mb-8">
                <div className="backdrop-blur-xl bg-white/40 border border-white/50 rounded-3xl p-8 shadow-2xl">
                    <div className="flex flex-col md:flex-row items-center gap-8">
                        <div className="relative">
                            <div className="w-12 h-12 rounded-full backdrop-blur-xl bg-gradient-to-br from-[#a855f7]/30 to-[#60a5fa]/30 border border-white/50 flex items-center justify-center shadow-xl">
                                <User size={30} className="text-[#9333ea]" />
                            </div>
                            <div className="absolute -top-2 -right-2 w-6 h-6 bg-[#4ade80] rounded-full border-4 border-white" />
                        </div>

                        <div className="flex-1 text-center md:text-left">
                            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-[#9333ea] to-[#3b82f6] bg-clip-text text-transparent">
                                {contactInfo?.full_name || "No Name"}
                            </h1>
                            <p className="text-lg text-gray-600 mt-2">
                                {contactInfo?.type} {contactInfo?.title}
                            </p>
                        </div>

                        <div className="editbtn cursor-pointer" onClick={handleEditClick}>
                            <img
                                width="48"
                                height="48"
                                src="https://img.icons8.com/fluency/48/create-new.png"
                                alt="create-new"
                            />
                        </div>
                        {contactInfo?.type?.toLowerCase() == "brand" && (
                            <button
                                onClick={() => setAccountShow(true)}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl
                            bg-gradient-to-r from-[#ec4899] to-[#9333ea]
                            text-white font-semibold shadow-lg hover:scale-105 transition"
                            >
                                <Building2 size={18} />
                                View Account
                            </button>)}
                    </div>
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-1 gap-6">
                {/* Contact Information - 2 columns */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Contact Information Card */}
                    <div className="backdrop-blur-xl bg-white/40 border border-white/50 rounded-3xl p-8 shadow-2xl">
                        <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#a855f7] to-[#60a5fa] flex items-center justify-center">
                                <User className="text-white" size={20} />
                            </div>
                            Contact Information
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <GlassInfo
                                icon={<User />}
                                label="Name"
                                value={contactInfo?.full_name}
                            />
                            <GlassInfo
                                icon={<User />}
                                label="Stage"
                                value={contactInfo?.stage}
                            />
                            <GlassInfo
                                icon={<Phone />}
                                label="Phone"
                                value={contactInfo?.phone_mobile}
                            />
                            <GlassInfo
                                icon={<Mail />}
                                label="Email"
                                value={contactInfo?.email1}
                            />
                            <GlassInfo
                                icon={<MapPin />}
                                label="Date Entered"
                                value={contactInfo?.date_entered}
                            />
                            <GlassInfo
                                icon={<User />}
                                label="Customer Type"
                                value={contactInfo?.customer_type}
                            />
                            <GlassInfo
                                icon={<ChartSpline />}
                                label="Status"
                                value={contactInfo?.status}
                            />
                            <GlassInfo
                                icon={<Target />}
                                label="Last Activity"
                                value={contactInfo?.date_modified}
                            />
                            <GlassInfo
                                icon={<Target />}
                                label="PayPal Email"
                                value={contactInfo?.paypal_email}
                            />
                        </div>
                    </div>

                    {/* Deals Information Section - FIXED HEIGHT AND SCROLLABLE */}
                    <div className="backdrop-blur-xl bg-white/40 border border-white/50 rounded-3xl p-8 shadow-2xl">
                        <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#4ade80] to-[#10b981] flex items-center justify-center">
                                <DollarSign className="text-white" size={20} />
                            </div>
                            Deals Information
                        </h2>

                        {/* Deals Summary Stats */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                            <div className="backdrop-blur-md bg-white/30 border border-white/60 p-4 rounded-2xl hover:scale-105 transition-transform duration-200">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#60a5fa]/20 to-[#22d3ee]/20 flex items-center justify-center">
                                        <Hash className="text-[#3b82f6]" size={20} />
                                    </div>
                                    <div>
                                        <p className="text-xs uppercase tracking-wider text-gray-600 font-bold">
                                            Total Deals
                                        </p>
                                        <p className="text-xl font-bold text-gray-800">
                                            {totalDealCount}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="backdrop-blur-md bg-white/30 border border-white/60 p-4 rounded-2xl hover:scale-105 transition-transform duration-200">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#fbbf24]/20 to-[#f97316]/20 flex items-center justify-center">
                                        <TrendingUp className="text-[#eab308]" size={20} />
                                    </div>
                                    <div>
                                        <p className="text-xs uppercase tracking-wider text-gray-600 font-bold">
                                            Highest Deal
                                        </p>
                                        <p className="text-xl font-bold text-gray-800">
                                            ${highestDealAmount}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="backdrop-blur-md bg-white/30 border border-white/60 p-4 rounded-2xl hover:scale-105 transition-transform duration-200">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#a855f7]/20 to-[#ec4899]/20 flex items-center justify-center">
                                        <Calendar className="text-[#9333ea]" size={20} />
                                    </div>
                                    <div>
                                        <p className="text-xs uppercase tracking-wider text-gray-600 font-bold">
                                            Deal Date
                                        </p>
                                        <p className="text-xl font-bold text-gray-800">
                                            {highestDealDate}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Deals Table with Fixed Height and Scrollable */}
                        {formData.deal && formData.deal.length > 0 ? (
                            <div className="space-y-4">
                                {/* Table Header */}
                                <div className="grid grid-cols-12 gap-4 mb-2 pb-3 pt-3 border-b border-gray-200/50 sticky top-0 bg-white/40 backdrop-blur-sm z-10">
                                    <div className="col-span-1">
                                        <p className="text-xs font-bold uppercase tracking-wider text-gray-600 flex items-center gap-1">
                                            <Hash size={20} /> #
                                        </p>
                                    </div>
                                    <div className="col-span-3">
                                        <p className="text-xs font-bold uppercase tracking-wider text-gray-600 flex items-center gap-1">
                                            <Calendar size={20} /> Date
                                        </p>
                                    </div>
                                    <div className="col-span-3">
                                        <p className="text-xs font-bold uppercase tracking-wider text-gray-600 flex items-center gap-1">
                                            <DollarSign size={20} /> Deal Amount
                                        </p>

                                    </div>
                                    <div className="col-span-5">
                                        <p className="text-xs font-bold uppercase tracking-wider text-gray-600 flex items-center gap-1">
                                            <Globe size={20} /> Website
                                        </p>
                                    </div>
                                </div>

                                {/* Table Rows with Fixed Height Container */}
                                <div
                                    className="space-y-2 h-[300px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent"
                                    style={{
                                        scrollbarWidth: "thin",
                                        scrollbarColor: "#d1d5db transparent",
                                    }}
                                >
                                    {formData.deal.map((deal, index) => (
                                        <div
                                            key={index}
                                            className={`grid grid-cols-12 gap-4 p-3 backdrop-blur-md bg-white/20 border ${index === highestDealIndex
                                                ? "border-[#f59e0b]/50"
                                                : "border-white/40"
                                                } rounded-xl items-center transition-all duration-200 hover:scale-101 hover:bg-white/50 hover:border-[#9333ea]/30`}
                                        >
                                            {/* Serial Number */}
                                            <div className="col-span-1">
                                                <div
                                                    className={`w-8 h-8 rounded-full flex items-center justify-center ${index === highestDealIndex
                                                        ? "bg-gradient-to-br from-[#fbbf24]/30 to-[#f97316]/30"
                                                        : "bg-gradient-to-br from-[#a855f7]/20 to-[#60a5fa]/20"
                                                        }`}
                                                >
                                                    <span
                                                        className={`text-sm font-bold ${index === highestDealIndex
                                                            ? "text-[#92400e]"
                                                            : "text-gray-800"
                                                            }`}
                                                    >
                                                        {index + 1}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Date */}
                                            <div className="col-span-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#a855f7]/20 to-[#ec4899]/20 flex items-center justify-center">
                                                        <Calendar size={16} className="text-[#9333ea]" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm text-gray-700">
                                                            {deal.date_entered
                                                                ? formatDate(deal.date_entered)
                                                                : "N/A"}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Deal Amount */}
                                            <div className="col-span-3">
                                                <div className="flex items-center gap-2">
                                                    <div
                                                        className={`w-10 h-10 rounded-lg flex items-center justify-center ${index === highestDealIndex
                                                            ? "bg-gradient-to-br from-[#fbbf24]/30 to-[#f97316]/30"
                                                            : "bg-gradient-to-br from-[#4ade80]/20 to-[#10b981]/20"
                                                            }`}
                                                    >
                                                        <DollarSign
                                                            size={16}
                                                            className={
                                                                index === highestDealIndex
                                                                    ? "text-[#92400e]"
                                                                    : "text-[#059669]"
                                                            }
                                                        />
                                                    </div>
                                                    <div>
                                                        <p
                                                            className={`text-base font-bold ${index === highestDealIndex
                                                                ? "text-[#92400e]"
                                                                : "text-gray-800"
                                                                }`}
                                                        >
                                                            ${deal.dealamount || "0"}
                                                        </p>
                                                        {index === highestDealIndex && (
                                                            <p className="text-xs text-[#d97706] font-medium">
                                                                Highest Deal
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Website */}
                                            <div className="col-span-5">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#60a5fa]/20 to-[#22d3ee]/20 flex items-center justify-center">
                                                        <Globe size={16} className="text-[#3b82f6]" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-semibold text-gray-800 truncate">
                                                            {deal.website_c || "N/A"}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-8">
                                <div className="w-16 h-16 mx-auto rounded-full backdrop-blur-md bg-white/30 border border-white/50 flex items-center justify-center mb-4">
                                    <DollarSign className="text-gray-400" size={24} />
                                </div>
                                <p className="text-gray-500 font-medium">No deals found</p>
                            </div>
                        )}
                    </div>

                    {/* Addresses Section */}
                    <div className="backdrop-blur-xl bg-white/40 border border-white/50 rounded-3xl p-8 shadow-2xl">
                        <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#60a5fa] to-[#22d3ee] flex items-center justify-center">
                                <MapPin className="text-white" size={20} />
                            </div>
                            Addresses
                        </h2>

                        <div className="space-y-4">
                            <GlassInfo
                                icon={<MapPin />}
                                label="Primary Address"
                                value={contactInfo?.billing_address_street}
                                fullWidth
                            />
                            <GlassInfo
                                icon={<MapPin />}
                                label="Secondary Address"
                                value={contactInfo?.alt_address_street}
                                fullWidth
                            />
                        </div>
                    </div>
                </div>


            </div>

            {/* Edit Modal */}
            {isEditing && (
                <div
                    className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
                    onClick={handleCancel}
                >
                    <div
                        className="backdrop-blur-xl bg-white/90 border border-white/50 rounded-3xl p-8 shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-3xl font-bold text-gray-800">
                                Edit Contact
                            </h2>
                            <button
                                onClick={handleCancel}
                                className="text-gray-500 hover:text-gray-700"
                            >
                                <X size={24} />
                            </button>
                        </div>
                        {/* Action Buttons */}
                        <div className="flex justify-end gap-4 mt-8 pt-6 border-t border-gray-200">
                            <button
                                onClick={handleCancel}
                                className="px-6 py-2 text-gray-600 font-semibold border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveContact}
                                className="px-6 py-2 bg-gradient-to-r from-[#9333ea] to-[#3b82f6] text-white font-semibold rounded-xl hover:from-[#7e22ce] hover:to-[#2563eb] transition-colors"
                            >
                                Save Changes
                            </button>
                        </div>
                        {/* Edit form content */}
                        <div className="space-y-8">
                            {/* Contact Information */}
                            <div>
                                <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                                    <User size={20} className="text-[#9333ea]" />
                                    Contact Information
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-600 mb-1">
                                            First Name
                                        </label>
                                        <input
                                            type="text"
                                            name="first_name"
                                            value={formData.contact.first_name || ""}
                                            onChange={(e) => handleChange(e, "contact")}
                                            className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#9333ea]"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-600 mb-1">
                                            Last Name
                                        </label>
                                        <input
                                            type="text"
                                            name="last_name"
                                            value={formData.contact.last_name || ""}
                                            onChange={(e) => handleChange(e, "contact")}
                                            className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#9333ea]"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-600 mb-1">
                                            Phone
                                        </label>
                                        <input
                                            type="tel"
                                            name="phone_mobile"
                                            value={formData.contact.phone_mobile || ""}
                                            onChange={(e) => handleChange(e, "contact")}
                                            className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#9333ea]"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-600 mb-1">
                                            PayPal Email
                                        </label>
                                        <input
                                            type="email"
                                            name="paypal_email"
                                            value={formData.contact.paypal_email || ""}
                                            onChange={(e) => handleChange(e, "contact")}
                                            className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#9333ea]"
                                        />
                                    </div>

                                </div>
                            </div>

                            {/* Contact Addresses */}
                            <div>
                                <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                                    <MapPin size={20} className="text-[#3b82f6]" />
                                    Contact Addresses
                                </h3>
                                <div className="space-y-4">
                                    <div className="col-span-full">
                                        <label className="block text-sm font-semibold text-gray-600 mb-1">
                                            Primary Address
                                        </label>
                                        <textarea
                                            name="billing_address_street"
                                            value={formData.contact.billing_address_street || ""}
                                            onChange={(e) => handleChange(e, "contact")}
                                            rows={3}
                                            className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3b82f6] resize-none"
                                        />
                                    </div>
                                    <div className="col-span-full">
                                        <label className="block text-sm font-semibold text-gray-600 mb-1">
                                            Secondary Address
                                        </label>
                                        <textarea
                                            name="alt_address_street"
                                            value={formData.contact.alt_address_street || ""}
                                            onChange={(e) => handleChange(e, "contact")}
                                            rows={3}
                                            className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3b82f6] resize-none"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}



// Glassmorphic Info Box
function GlassInfo({ icon, label, value, fullWidth = false }) {
    return (
        <div
            className={`
      backdrop-blur-md bg-white/30 border border-white/60
      p-4 rounded-2xl flex items-center gap-4
      shadow-lg hover:shadow-xl cursor-pointer hover:scale-103 transition-all duration-200
      ${fullWidth ? "col-span-full" : ""}
    `}
        >
            <div
                className="
        w-12 h-12 flex items-center justify-center rounded-xl
        bg-gradient-to-br from-[#a855f7]/20 to-[#60a5fa]/20
        backdrop-blur-sm border border-white/40
        text-[#9333ea] hover:rotate-360 transition-transform duration-600
      "
            >
                {icon}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-xs uppercase tracking-wider text-gray-600 font-bold">
                    {label}
                </p>
                <p className="text-sm md:text-base font-semibold text-gray-800 mt-1 truncate">
                    {value || "N/A"}
                </p>
            </div>
        </div>
    );
}
