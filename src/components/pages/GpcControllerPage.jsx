import { useContext, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import Header from "./settingpages/Header";
import { PageContext } from "../../context/pageContext";
import { useGpcController, useToggleControl } from "../../queries/controller.queries";
import { useQuery } from "@tanstack/react-query";
import { getStages } from "../../services/utils";

export default function GpcControllerPage() {
  const dispatch = useDispatch();
  const { isPending: updating, mutate } = useToggleControl()
  const { data, isPending: loading } = useGpcController()
  const checkboxes = data?.data ?? []
  const { superfastReply, superfastToggle } = useContext(PageContext);
  const [activeStage, setActiveStage] = useState("others");
  const handleToggle = (id, value) => {
    const currentValue = value === "1" ? "0" : "1";
    mutate({ id, value: currentValue });
  };
  const { data: stages, isPending: loadingStages } = useQuery({ queryKey: ['stages'], queryFn: getStages })
  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <Header text={"Gpc Controller"} />
      <div className="flex flex-wrap gap-3 mt-6">
        {Object.entries(stages ?? {}).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setActiveStage(key)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition
              ${activeStage === key
                ? "bg-blue-600 text-white shadow"
                : "bg-gray-100 hover:bg-gray-200 text-gray-700"
              }`}
          >
            {label}
          </button>
        ))}
      </div>
      {loading ? (
        <p className="text-center text-gray-500 mt-6">Loading settings...</p>
      ) : (
        <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-200">
          {checkboxes.length === 0 && (
            <p className="text-center text-gray-500 py-6">
              No settings available
            </p>
          )}
          {activeStage === "others" && (
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <span className="text-sm font-medium text-gray-700 capitalize">
                Superfast Reply
              </span>

              <button
                type="button"
                onClick={superfastToggle}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${superfastReply ? "bg-indigo-600" : "bg-gray-300"
                  }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${superfastReply ? "translate-x-6" : "translate-x-1"
                    }`}
                />
              </button>
            </div>
          )}
          {checkboxes.filter(control => !activeStage || control.stage === activeStage).map((control, index) => (
            <div
              key={control.id}
              className={`flex items-center justify-between px-6 py-4 ${index !== checkboxes.length - 1
                ? "border-b border-gray-100"
                : ""
                }`}
            >
              <span className="text-sm font-medium text-gray-700 capitalize">
                {control.name}
              </span>

              {/* Toggle */}
              <button
                type="button"
                disabled={updating}
                onClick={() => handleToggle(control.id, control.is_allowed)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${control.is_allowed === "1" ? "bg-indigo-600" : "bg-gray-300"
                  } ${updating ? "opacity-60 cursor-not-allowed" : ""}`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${control.is_allowed === "1" ? "translate-x-6" : "translate-x-1"
                    }`}
                />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
