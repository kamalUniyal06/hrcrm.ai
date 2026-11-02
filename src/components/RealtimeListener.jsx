import { useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { io } from "socket.io-client";
import { toast } from "react-hot-toast";
import { hrKeys, useMarkNotifications, useRealtimeConfig } from "../queries/hr.queries";
import { notificationDestination } from "../utils/hrRecords";
import { isEventForMe, parseRealtimeEvent, realtimeRefreshKeys, realtimeSettings } from "../utils/realtime";
import NotificationToast from "./pages/notifications/NotificationToast";

const text = (value) => String(value ?? "").trim();

/**
 * Listens to the CRM's real-time events once signed in (Org/UI_INTEGRATION.md): refreshes the
 * lists an event touches and shows a toast for new notifications. The bell keeps polling every
 * 60 s, so a dropped socket only delays updates.
 */
export default function RealtimeListener() {
  const isCandidate = useSelector((state) => state.user.userInfo?.subject_type === "candidate");
  const config = useRealtimeConfig({ enabled: !isCandidate });
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const mark = useMarkNotifications();

  // The socket outlives renders; it reaches the latest navigate / mutation through this ref.
  const handle = useRef(null);
  useEffect(() => {
    handle.current = (event) => {
      for (const queryKey of realtimeRefreshKeys(event)) void queryClient.invalidateQueries({ queryKey });
      if (event.type !== "notification.new") return;
      const { details } = event;
      const id = text(details.notification_id) || event.chatId;
      const copyItem = text(details.copy_item);
      const open = (toastId) => {
        toast.dismiss(toastId);
        if (id) mark.mutate({ id }, { onError: (error) => toast.error(error.message) });
        const target = notificationDestination({ redirectTo: details.redirect_to }, window.location.origin);
        navigate(target?.internal ? target.to : "/notifications");
      };
      toast.custom(
        (t) => (
          <NotificationToast
            visible={t.visible}
            title={event.message || "You have a new notification"}
            hot={text(details.notification_type).toLowerCase() === "hot"}
            copyItem={copyItem}
            onOpen={() => open(t.id)}
            onClose={() => toast.dismiss(t.id)}
          />
        ),
        // Copyable codes stay up longer so there is time to copy them.
        { id: `notification-${id || Date.now()}`, duration: copyItem ? 15000 : 8000, position: "top-right" },
      );
    };
  });

  const settings = realtimeSettings(config.data);
  const { url, event: listenEvent, userId, broadcast, crm } = settings ?? {};
  useEffect(() => {
    if (!url) return undefined;
    const mine = { url, event: listenEvent, userId, broadcast, crm };
    const socket = io(url, { transports: ["websocket", "polling"] });
    let connectedBefore = false;
    socket.on("connect", () => {
      // Events sent while disconnected are lost, so catch up on the bell after a reconnect.
      if (connectedBefore) void queryClient.invalidateQueries({ queryKey: hrKeys.notificationCounts });
      connectedBefore = true;
    });
    socket.on(listenEvent, (raw) => {
      const event = parseRealtimeEvent(raw);
      if (!isEventForMe(event, mine) || event.type === "test.ping") return;
      handle.current?.(event);
    });
    return () => socket.disconnect();
  }, [url, listenEvent, userId, broadcast, crm, queryClient]);

  return null;
}
