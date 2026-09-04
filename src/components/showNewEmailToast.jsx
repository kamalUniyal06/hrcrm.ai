import { toast } from "react-hot-toast";
import { MailCheck, ArrowRight } from "lucide-react";
import { queryClient } from "../lib/queryClient";
import { emailKeys } from "../queries/email.queries";

export const showNewEmailToast = ({
    dispatch,
    navigate,
    handleClear,
    preferencesAction,
    unrepliedAction,
}) => {
    toast.custom(
        (t) => (
            <div
                className={`
        ${t.visible ? "animate-enter" : "animate-leave"}
        w-[340px]
        bg-white
        border border-gray-200
        rounded-xl
        shadow-lg
        overflow-hidden
      `}
            >
                <div className="p-3 flex items-start gap-3">
                    <div className="h-9 w-9 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                        <MailCheck size={18} className="text-blue-600" />
                    </div>

                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900">
                            New Email Received
                        </p>

                        <p className="text-xs text-gray-500 mt-0.5">
                            A new  email has arrived.
                        </p>
                    </div>

                    <button
                        onClick={() => {
                            dispatch(unrepliedAction.setShowNewEmailBanner(false));
                            dispatch(preferencesAction.resetTablePreferences("emails"));
                            handleClear();
                            queryClient.removeQueries({ queryKey: emailKeys.all });
                            navigate("/");
                            toast.dismiss(t.id);
                        }}
                        className="text-xs font-medium px-2.5 py-1.5 rounded-md bg-gray-100 hover:bg-gray-200 transition-colors"
                    >
                        Open
                    </button>
                </div>

                <div className="h-[2px] bg-gray-100">
                    <div className="h-full bg-blue-500 animate-[progress_7s_linear_forwards]" />
                </div>
            </div>
        ),
        {
            duration: 7000,
            position: "top-right",
        }
    );
};