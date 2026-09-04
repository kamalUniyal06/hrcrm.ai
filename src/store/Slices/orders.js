import { createSlice } from "@reduxjs/toolkit";
import { CREATE_DEAL_API_KEY, FETCH_GPC_X_API_KEY } from "../constants";
import { extractEmail, showConsole } from "../../assets/assets";
import { applyHashtag, getCurrentUser } from "../../services/utils";
import {
  updateActivity,
  createLedgerEntry,
  buildLedgerItem,
} from "../../services/utils";
import { apiRequest, fetchGpc } from "../../services/api";
import { queryClient } from "../../lib/queryClient";
import { orderKeys } from "../../queries/orders.queries";

const ordersSlice = createSlice({
  name: "orders",
  initialState: {
    loading: false,
    orders: [],
    statusLists: {},
    paymentTypes: {},
    count: 0,
    stats: [],
    pageCount: 1,
    pageIndex: 1,
    error: null,
    creating: false,
    updating: false,
    deleting: false,
    message: null,
    summary: null,
    updateLinkLoading: false,
    updateLinkMessage: null,
    creatingLink: false,
    creatingLinkMessage: null,
    newlyOrder: null,
    creatingPost: false,
    postMessage: null,
  },
  reducers: {
    getOrdersRequest(state, action) {
      state.loading = action.payload;
      state.error = null;
    },
    getOrdersSucess(state, action) {
      const {
        count,
        orders,
        pageCount,
        pageIndex,
        statusLists,
        paymentTypes,
        summary,
        stats,
      } = action.payload;
      state.loading = false;
      if (pageIndex === 1) {
        state.orders = orders;
      } else {
        state.orders = [...state.orders, ...orders];
      }
      state.statusLists = statusLists;
      state.paymentTypes = paymentTypes;
      state.count = count;
      state.stats = stats;
      state.updateId = null;
      state.summary = summary;
      state.pageCount = pageCount;
      state.pageIndex = pageIndex;
      state.error = null;
    },
    getOrdersFailed(state, action) {
      state.loading = false;
      state.error = action.payload;
    },
    updateOrderRequest(state) {
      state.updating = true;
      state.message = null;
      state.error = null;
    },
    createOrderRequest(state) {
      state.creating = true;
      state.message = null;
      state.error = null;
      state.newlyOrder = null;
    },
    createOrderSuccess(state, action) {
      state.creating = false;
      state.message = action.payload;
      state.error = null;
    },
    createOrder2Success(state, action) {
      state.creating = false;
      state.message = action.payload.message;
      state.error = null;
    },
    createOrder3Success(state, action) {
      state.creating = false;
      state.message = action.payload.message;
      state.error = null;
    },
    createOrderFailed(state, action) {
      state.creating = false;
      state.error = action.payload;
      state.message = null;
      state.newlyOrder = null;
    },
    createLinkRequest(state) {
      state.creatingLink = true;
      state.creatingLinkMessage = null;
      state.error = null;
    },
    createLinkSuccess(state, action) {
      state.creatingLink = false;
      state.orders = action.payload.orders;
      state.creatingLinkMessage = action.payload.message;
      state.error = null;
    },
    createLinkFailed(state, action) {
      state.creatingLink = false;
      state.error = action.payload;
      state.creatingLinkMessage = null;
    },
    updateOrderSuccess(state, action) {
      state.updating = false;
      state.message = action.payload.message;
      state.error = null;
    },
    updateOrderFailed(state, action) {
      state.updating = false;
      state.error = action.payload;
      state.message = null;
    },
    updateLinkRequest(state) {
      state.updateLinkLoading = true;
      state.updateLinkMessage = null;
      state.error = null;
    },
    updateLinkSuccess(state, action) {
      state.updateLinkLoading = false;
      state.orders = action.payload.orders;
      state.updateLinkMessage = action.payload.message;
      state.updateId = action.payload.id;
      state.error = null;
    },
    updateLinkFailed(state, action) {
      state.updateLinkLoading = false;
      state.error = action.payload;
      state.updateLinkMessage = null;
    },
    deleteLinkRequest(state) {
      state.deleting = true;
      state.error = null;
    },
    deleteLinkSuccess(state, action) {
      state.deleting = false;
      state.orders = action.payload.orders;
      state.updateLinkMessage = "Order Deleted Successfully";
      state.error = null;
    },
    deleteLinkFailed(state, action) {
      state.deleting = false;
      state.error = action.payload;
    },
    createLinkRequest(state) {
      state.creating = true;
      state.error = null;
    },
    createLinkSuccess(state, action) {
      state.creating = false;
      state.orders = action.payload.orders;
      state.error = null;
    },
    createLinkFailed(state, action) {
      state.creating = false;
      state.error = action.payload;
    },
    clearAllErrors(state) {
      state.error = null;
    },
    clearAllMessages(state) {
      state.message = null;
      state.updateLinkMessage = null;
      state.creatingLinkMessage = null;
    },
    resetUpdateId(state) {
      state.updateId = null;
    },
    setUpdateOrder(state, action) {
      state.orders = action.payload;
    },
    setOrders(state, action) {
      const { data } = action.payload;
      state.count = data?.length ?? 0;
      state.orders = data ?? [];
    },
  },
});

export const getOrders = ({
  email = null,
  page = 1,
  loading = true,
  brand = false,
}) => {
  return async (dispatch, getState) => {
    dispatch(ordersSlice.actions.getOrdersRequest(loading));
    try {
      let res;
      const timeline = getState().ladger.timeline;
      const params = {
        ...(timeline && timeline !== "null" ? { filter: timeline } : {}),
        email,
        page,
        page_size: "50",
      };
      brand
        ? (res = await fetchGpc({
          params: { type: "brandTimeline", case: "order", ...params },
        }))
        : (res = await fetchGpc({ params: { type: "get_orders", ...params } }));
      const data = brand ? res.data.order : res;
      showConsole && console.log(`${brand ? "brand" : ""} Orders `, data);
      dispatch(
        ordersSlice.actions.getOrdersSucess({
          count: data.data_count ?? 0,
          statusLists: data.order_status_list,
          paymentTypes: data.invoice_type_list,
          orders: data.data,
          stats: data.stats ? data.stats : [],
          pageCount: data.total_pages,
          pageIndex: data.current_page,
          summary: data.summary ?? null,
        }),
      );
      dispatch(ordersSlice.actions.clearAllErrors());
    } catch (error) {
      dispatch(ordersSlice.actions.getOrdersFailed("Fetching Orders Failed"));
    }
  };
};

export const createOrder = (email, message_id) => {
  return async (dispatch, getState) => {
    dispatch(ordersSlice.actions.createOrderRequest());
    const domain = getState().user.crmEndpoint.split("?")[0];
    const crmEndpoint = getState().user.crmEndpoint;
    const triggerHashtag = (memo_no, method = "GET") => {
      applyHashtag({
        email,
        memo_no,
        method,
      });
    };
    try {
      const data = await apiRequest({
        endpoint: `${domain}?entryPoint=manual_order`,
        params: {
          email,
          assigned_user_id: getCurrentUser().id,
          ...(message_id ? { message_id } : {}),
        },
        headers: {
          "X-Api-Key": FETCH_GPC_X_API_KEY,
          "Content-Type": "application/json",
        },
      });
      showConsole && console.log(`Orders created `, data);
      if (!data.order.success) {
        dispatch(ordersSlice.actions.createOrderFailed(data.order));
        return;
      }
      dispatch(
        ordersSlice.actions.createOrderSuccess("Order Created Successfully"),
      );
      // ✅ Trigger hashtag for Order Creation (memo_no = 13)
      triggerHashtag(17, "GET");
      queryClient.invalidateQueries({ queryKey: orderKeys.all })

      dispatch(ordersSlice.actions.clearAllErrors());
      updateActivity(
        email,

        "Order Created",
      );
    } catch (error) {
      dispatch(ordersSlice.actions.createOrderFailed("Creating Order Failed"));
    }
  };
};
export const createOrder2 = ({ email, order, threadId }) => {
  return async (dispatch, getState) => {
    dispatch(ordersSlice.actions.createOrderRequest());
    console.log("EMAIL", email);
    console.log("ORDER", order);
    console.log("THREAD", threadId);
    try {
      const domain = getState().user.crmEndpoint.split("?")[0];
      const crmEndpoint = getState().user.crmEndpoint;

      const triggerHashtag = (memo_no, method = "GET") => {
        applyHashtag({
          email,
          memo_no,
          method,
        });
      };
      let orders =
        order.order_type == "GUEST POST"
          ? order.seo_backlinks.map((link) => {
            return {
              type: "Guest Post",
              site: link.website,
              content_doc: link.gp_doc_url_c,
            };
          })
          : order.seo_backlinks.map((link) => {
            return {
              type: "Link Insertion",
              site: link.website,
              post_url: link.website,
              their_link: [
                {
                  url: link.backlink_url,
                  anchor_text: link.anchor_text_c,
                },
              ],
            };
          });
      console.log("ORDERS", orders);
      const data = await fetchGpc({
        method: "POST",
        params: { type: "manual_order" },
        body: {
          email: email,
          thread_id: threadId,
          assigned_user_id: getCurrentUser()?.id,

          orders,
        },
      });
      showConsole && console.log(`Create Order Manully`, data);
      if (!data.success) {
        throw new Error("Failed To Create Order");
      }
      dispatch(
        ordersSlice.actions.createOrder2Success({
          message: "Order Created Successfully",
        }),
      );
      // ✅ Trigger hashtag for Order Creation (memo_no = 17)
      triggerHashtag(17, "GET");
      dispatch(ordersSlice.actions.clearAllErrors());
      updateActivity(
        email,
        "Manual Order Created ",
      );
    } catch (error) {
      console.log("ERROR", error);
      dispatch(ordersSlice.actions.createOrderFailed("Order Creation Failed"));
    }
  };
};
export const createOrder3 = (email, orders = [], send) => {
  return async (dispatch, getState) => {
    dispatch(ordersSlice.actions.createOrderRequest());
    console.log("EMAIL", email);
    console.log("ORDER", orders);
    try {
      const domain = getState().user.crmEndpoint.split("?")[0];
      const crmEndpoint = getState().user.crmEndpoint;

      const triggerHashtag = (memo_no, method = "GET") => {
        applyHashtag({
          email,
          memo_no,
          method,
        });
      };
      {
        orders.map(async (order) => {
          data = await apiRequest({
            endpoint: `${domain}?entryPoint=manual_order`,
            params: {
              email,
              message_id: order.message_id,
              website: order.website,
              amount: order.amount,
            },
            headers: {
              "X-Api-Key": FETCH_GPC_X_API_KEY,
              "Content-Type": "application/json",

            },
          });
          showConsole && console.log(`Create Order Manully`, data);
        });
      }

      dispatch(
        ordersSlice.actions.createOrder3Success({
          message: "Order Created Successfully",
        }),
      );
      // ✅ Trigger hashtag for Order Creation (memo_no = 17)
      triggerHashtag(17, "GET");
      dispatch(ordersSlice.actions.clearAllErrors());
      updateActivity(
        getState().ladger.email,
        "Order Fetched ",
      );
    } catch (error) {
      console.log("ERROR", error);
      dispatch(ordersSlice.actions.createOrderFailed("Order Creation Failed"));
    }
  };
};

export const updateOrder = ({ order, email }) => {
  return async (dispatch, getState) => {
    dispatch(ordersSlice.actions.updateOrderRequest());
    email = email ?? extractEmail(order.real_name ?? order.email);
    showConsole && console.log("Order To Be Update", order);
    showConsole && console.log("Update Order Email", email);

    try {
      const domain = getState().user.crmEndpoint.split("?")[0];
      const crmEndpoint = getState().user.crmEndpoint;
      const triggerHashtag = (memo_no, method = "GET") => {
        applyHashtag({
          email,
          memo_no,
          method,
        });
      };
      const noteRes = await fetchGpc({
        method: "POST",
        params: { type: "take_notes" },
        body: {
          record_id: order.id,
          notes: order.note,
        },
      });
      console.log("NOTE RES", noteRes);
      const data = await apiRequest({
        endpoint: `${domain}?entryPoint=get_post_all`,
        method: "POST",
        params: { action_type: "post_data" },
        body: {
          parent_bean: {
            module: "outr_order_gp_li",
            ...order,
          },
        },
        headers: {
          "X-Api-Key": `${CREATE_DEAL_API_KEY}`,
          "Content-Type": "aplication/json",
        },
      });
      showConsole && console.log(`Update Order`, data);
      dispatch(
        ordersSlice.actions.updateOrderSuccess({
          message: `Order Updated Successfully`,
        }),
      );

      // ✅ Trigger hashtag for Order Creation (memo_no = 17)
      triggerHashtag(18, "GET");
      dispatch(ordersSlice.actions.clearAllErrors());

      updateActivity(
        email,
        "Order Updated ",
      );

      // Determine ledger status based on order_status
      let ledgerStatus = "Order-Updated"; // default

      if (order.order_status === "accepted") {
        ledgerStatus = "Order-Accepted";
      } else if (order.order_status === "rejected_nontechnical") {
        ledgerStatus = "Order-Rejected";
      } else if (order.order_status === "completed") {
        ledgerStatus = "Order-Completed";
      }
      await createLedgerEntry({
        domain: getState().user.crmEndpoint.split("?")[0],
        email: email,
        thread_id: order.thread_id,
        group: "Order",
        items: [
          buildLedgerItem({
            status: ledgerStatus,
            detail: `order_id: {${order.order_id}}`,
            ladgerState: getState().ladger,
            user: getCurrentUser(),
            parent_name: "outr_order_gp_li",
          }),
        ],
      });
    } catch (error) {
      showConsole && console.log(error);
      dispatch(ordersSlice.actions.updateOrderFailed("Updating Order Failed"));
    }
  };
};
export const updateSeoLink = (orderId, link, email) => {
  return async (dispatch, getState) => {
    dispatch(ordersSlice.actions.updateLinkRequest());
    showConsole && console.log("Update Seo Link", link);
    link = { ...link, link_amount_c: `$${link.link_amount_c}` };
    console.log("order id", orderId);
    try {
      const data = await apiRequest({
        endpoint: ` ${getState().user.crmEndpoint.split("?")[0]}?entryPoint=get_post_all`,
        params: { action_type: "post_data" },
        body: {
          parent_bean: {
            module: "outr_seo_backlinks",
            ...link,
          },
        },
        method: "POST",
        headers: {
          "X-Api-Key": `${CREATE_DEAL_API_KEY}`,
          "Content-Type": "aplication/json",
        },
      });
      showConsole && console.log(`Update Order Link`, data);
      const updatedOrders = getState().orders.orders.map((o) => {
        if (o.order_id === orderId) {
          return {
            ...o,
            seo_backlinks: o.seo_backlinks.map((l) =>
              l.id === link.id ? { ...l, ...link } : l,
            ),
          };
        }
        return o;
      });
      dispatch(
        ordersSlice.actions.updateLinkSuccess({
          orders: updatedOrders,
          message: "Order Link Updated Successfully",
        }),
      );
      queryClient.invalidateQueries({ queryKey: orderKeys.all })
      dispatch(ordersSlice.actions.clearAllErrors());
      updateActivity(
        email,
        " Order Link Updated ",
      );
    } catch (error) {
      showConsole && console.log(error);
      dispatch(
        ordersSlice.actions.updateLinkFailed("Updating Order Link Failed"),
      );
    }
  };
};

export const deleteLink = (orderId, linkId) => {
  return async (dispatch, getState) => {
    dispatch(ordersSlice.actions.deleteLinkRequest());
    try {
      const crmEndpoint = getState().user.crmEndpoint;
      const email = getState().viewEmail?.contactInfo?.email1
      const triggerHashtag = (memo_no, method = "GET") => {
        applyHashtag({
          email,
          memo_no,
          method,
        });
      };
      const data = await fetchGpc({
        method: "POST",
        params: {
          type: "delete_record",
          module_name: "outr_seo_backlinks",
          record_id: linkId,
        },
      });
      showConsole && console.log(`Delete Order Link`, data);
      if (!data.success) {
        throw new Error(data.message);
      }
      const updatedOrders = getState().orders.orders.map((o) => {
        if (o.id === orderId) {
          return {
            ...o,
            seo_backlinks: o.seo_backlinks.filter((l) => l.id !== linkId),
          };
        }
        return o;
      });
      dispatch(
        ordersSlice.actions.deleteLinkSuccess({
          orders: updatedOrders,
        }),
      );
      // ✅ Trigger hashtag for Order Creation (memo_no = 17)
      triggerHashtag(19, "GET");
      dispatch(ordersSlice.actions.clearAllErrors());
      updateActivity(
        email,
        "Order Link Deleted ",
      );
    } catch (error) {
      dispatch(ordersSlice.actions.deleteLinkFailed(error.message));
    }
  };
};
export const createLink = (orderId, link) => {
  return async (dispatch, getState) => {
    dispatch(ordersSlice.actions.createLinkRequest());
    try {
      const domain = getState().user.crmEndpoint.split("?")[0];
      const crmEndpoint = getState().user.crmEndpoint;

      const triggerHashtag = (memo_no, method = "GET") => {
        applyHashtag({
          email,
          memo_no,
          method,
        });
      };
      const payload = {
        parent_bean: {
          module: "outr_order_gp_li",
          id: orderId,
        },
        child_bean: {
          module: "outr_seo_backlinks",
          ...link,
        },
      };
      const data = await apiRequest({
        endpoint: `${domain}?entryPoint=get_post_all`,
        method: "POST",
        params: { action_type: "post_data" },
        body: payload,
        headers: {
          "X-Api-Key": `${CREATE_DEAL_API_KEY}`,
          "Content-Type": "aplication/json",
        },
      });
      showConsole && console.log(`Create Link`, data);
      const updatedOrders = getState().orders.orders.map((o) => {
        if (o.id === orderId) {
          return {
            ...o,
            seo_backlinks: [
              ...o.seo_backlinks,
              { ...link, id: Date.now().toString() },
            ],
          };
        }
        return o;
      });
      dispatch(
        ordersSlice.actions.createLinkSuccess({
          message: "Link Created Successfully",
          orders: updatedOrders,
        }),
      );
      // ✅ Trigger hashtag for Order Creation (memo_no = 17)
      triggerHashtag(18, "GET");
      dispatch(ordersSlice.actions.clearAllErrors());
      updateActivity(
        getState().ladger.email,
        "Order Link Created ",
      );
    } catch (error) {
      dispatch(ordersSlice.actions.createLinkFailed("Link Creation Failed"));
    }
  };
};

export const orderAction = ordersSlice.actions;
export default ordersSlice.reducer;
