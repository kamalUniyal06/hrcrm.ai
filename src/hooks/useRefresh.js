import { useContext, useEffect, useState } from "react";
import { SocketContext } from "../context/SocketContext";
import { hotAction } from "../store/Slices/hotSlice";
import { useDispatch, useSelector } from "react-redux";
import { queryClient } from "../lib/queryClient";
import { hotKeys } from "../queries/hot.queries";
import { offerKeys } from "../queries/offers.queries";
import { dealKeys } from "../queries/deals.queries";
import { emailKeys } from "../queries/email.queries";
import { invoiceKeys } from "../queries/invoice.queries";

function useRefresh() {
    const { notificationCount, setNotificationCount, currentEventThreadId } = useContext(SocketContext);
    const dispatch = useDispatch();
    useEffect(() => {
        if (notificationCount.unreplied_email) {
            queryClient.invalidateQueries({ queryKey: emailKeys.all })
            setNotificationCount((prev) => ({ ...prev, unreplied_email: null }));
        }
        if (notificationCount.outr_el_process_audit) {
            queryClient.invalidateQueries({ queryKey: hotKeys.all })
            dispatch(hotAction.updateCount(1));
            setNotificationCount((prev) => ({ ...prev, outr_el_process_audit: null }));
        }
        if (notificationCount.outr_deal_fetch) {
            queryClient.invalidateQueries({ queryKey: hotKeys.all })
            queryClient.invalidateQueries({ queryKey: dealKeys.all })

            dispatch(hotAction.updateCount(1));
            setNotificationCount((prev) => ({
                ...prev,
                outr_deal_fetch: null,
            }));
        }
        if (notificationCount.outr_order_gp_li) {

            queryClient.invalidateQueries({ queryKey: hotKeys.all })

            dispatch(hotAction.updateCount(1));
            setNotificationCount((prev) => ({
                ...prev,
                outr_order_gp_li: null,
            }));
        }
        if (notificationCount.outr_self_test) {
            queryClient.invalidateQueries({ queryKey: hotKeys.all })

            dispatch(hotAction.updateCount(1));
            setNotificationCount((prev) => ({
                ...prev,
                outr_self_test: null,
            }));
        }
        if (notificationCount.outr_offer) {
            queryClient.invalidateQueries({ queryKey: hotKeys.all })
            queryClient.invalidateQueries({ queryKey: offerKeys.all })
            queryClient.invalidateQueries({ queryKey: dealKeys.all })
            dispatch(hotAction.updateCount(1));
            setNotificationCount((prev) => ({
                ...prev,
                outr_offer: null,
            }));
        }
        if (notificationCount.outr_paypal_invoice_links) {
            queryClient.invalidateQueries({ queryKey: hotKeys.all })
            queryClient.invalidateQueries({ queryKey: invoiceKeys.all })
            dispatch(hotAction.updateCount(1));
            setNotificationCount((prev) => ({
                ...prev,
                outr_paypal_invoice_links: null,
            }));
        }
    }, [notificationCount, dispatch, setNotificationCount]);


    return [];
}

export default useRefresh;