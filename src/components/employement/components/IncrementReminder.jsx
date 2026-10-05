import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import {
  clearRememberedIncrement,
  getPendingIncrement,
  getRememberedIncrementId,
} from "../api/increment.api";

const REMINDER_INTERVAL = 15 * 60 * 1000;

export default function IncrementReminder({ email }) {
  const navigate = useNavigate();

  useEffect(() => {
    if (!email) return undefined;
    let active = true;

    const check = async () => {
      const incrementId = getRememberedIncrementId(email);
      if (!incrementId) return;
      try {
        const pending = await getPendingIncrement(incrementId);
        if (!active) return;
        if (!pending?.pendingQuestions.length) {
          clearRememberedIncrement(email);
          return;
        }
        toast(
          (item) => (
            <div className="flex items-center gap-3 text-sm">
              <span className="min-w-0 flex-1 text-slate-700">
                Please complete your increment questions.
              </span>
              <button
                type="button"
                className="shrink-0 font-semibold text-blue-700"
                onClick={() => {
                  toast.dismiss(item.id);
                  navigate("/increment-request");
                }}
              >
                Continue
              </button>
            </div>
          ),
          { duration: 8000, id: `increment-reminder-${incrementId}` },
        );
      } catch {
        // A background reminder should never interrupt the current page.
      }
    };

    void check();
    const interval = window.setInterval(check, REMINDER_INTERVAL);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [email, navigate]);

  return null;
}
