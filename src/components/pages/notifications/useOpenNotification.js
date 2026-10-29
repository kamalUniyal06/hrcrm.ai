import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { useMarkNotifications } from "../../../queries/hr.queries";
import { notificationTarget } from "../../../utils/hrRecords";

/** Marks the notification seen, then follows its link: in-app with the router, anything else in a new tab. */
export function useOpenNotification() {
  const navigate = useNavigate();
  const mark = useMarkNotifications();
  return (item, after) => {
    if (!item.seen) mark.mutate({ id: item.id }, { onError: (error) => toast.error(error.message) });
    const target = notificationTarget(item.linkUrl, window.location.origin);
    after?.();
    if (!target) return;
    if (target.internal) navigate(target.to);
    else window.open(target.to, "_blank", "noopener,noreferrer");
  };
}
