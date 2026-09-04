import React, { useState } from "react";
import { Building2, Phone, Globe, MapPin, X, Edit3 } from "lucide-react";

export default function AccountPage({
  setAccountShow,
  formData,
  setFormData,
  handleSave,
}) {
  const [isEditing, setIsEditing] = useState(false);
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#faf5ff] to-[#fdf2f8] p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold flex items-center gap-3 text-gray-800">
            <Building2 />
            Account Details
          </h1>

          <div className="flex gap-3">
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl
              bg-gradient-to-r from-[#9333ea] to-[#3b82f6]
              text-white font-semibold shadow-lg hover:scale-105 transition"
            >
              <Edit3 size={18} />
              Edit Account
            </button>

            <button
              onClick={() => setAccountShow(false)}
              className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              Back
            </button>
          </div>
        </div>

        {/* Account Card */}
        <div className="backdrop-blur-xl bg-white/40 border border-white/50 rounded-3xl p-8 shadow-2xl space-y-4">
          <Info
            label="Company"
            value={formData?.account?.name}
            icon={<Building2 />}
          />
          <Info
            label="Phone"
            value={formData?.account?.phone_office}
            icon={<Phone />}
          />
          <Info
            label="Website"
            value={formData?.account?.website}
            icon={<Globe />}
          />
          <Info
            label="Billing Address"
            value={formData?.account?.billing_address_street}
            icon={<MapPin />}
          />
          <Info
            label="Shipping Address"
            value={formData?.account?.shipping_address_street}
            icon={<MapPin />}
          />
        </div>
      </div>

      {/* EDIT MODAL */}
      {isEditing && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setIsEditing(false)}
        >
          <div
            className="backdrop-blur-xl bg-white/90 border border-white/50 rounded-3xl p-8 shadow-2xl max-w-3xl w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Edit Account</h2>
              <button onClick={() => setIsEditing(false)}>
                <X size={24} />
              </button>
            </div>

            <div className="space-y-6">
              <Input
                label="Company"
                value={formData.account.name || ""}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    account: { ...formData.account, name: e.target.value },
                  }))
                }
              />

              <Input
                label="Phone"
                value={formData.account.phone_office || ""}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    account: {
                      ...formData.account,
                      phone_office: e.target.value,
                    },
                  }))
                }
              />

              <Input
                label="Website"
                value={formData.account.website || ""}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    account: {
                      ...formData.account,
                      website: e.target.value,
                    },
                  }))
                }
              />
              <Input
                label="Billing Address"
                value={formData.account.billing_address_street || ""}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    account: {
                      ...formData.account,
                      billing_address_street: e.target.value,
                    },
                  }))
                }
              />
              <Input
                label="Shipping Address"
                value={formData.account.shipping_address_street || ""}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    account: {
                      ...formData.account,
                      shipping_address_street: e.target.value,
                    },
                  }))
                }
              />
            </div>

            <div className="flex justify-end gap-4 mt-8 pt-6 border-t">
              <button
                onClick={() => setIsEditing(false)}
                className="px-6 py-2 border rounded-xl text-gray-600"
              >
                Cancel
              </button>

              <button
                onClick={() => {
                  handleSave();
                  setIsEditing(false);
                }}
                className="px-6 py-2 bg-gradient-to-r from-[#9333ea] to-[#3b82f6] text-white rounded-xl"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- Helpers ---------- */

function Info({ icon, label, value }) {
  return (
    <div className="flex items-center gap-4 p-4 bg-white/60 rounded-2xl shadow">
      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#a855f7]/20 to-[#60a5fa]/20 flex items-center justify-center text-[#9333ea]">
        {icon}
      </div>
      <div>
        <p className="text-xs font-bold text-gray-600 uppercase">{label}</p>
        <p className="text-base font-semibold text-gray-800">
          {value || "N/A"}
        </p>
      </div>
    </div>
  );
}

function Input({ label, ...props }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-600 mb-1">
        {label}
      </label>
      <input
        {...props}
        className="w-full p-3 border border-gray-300 rounded-xl
        focus:outline-none focus:ring-2 focus:ring-[#9333ea]"
      />
    </div>
  );
}
