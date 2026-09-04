import { showConsole } from "../assets/assets";
import { queryClient } from "../lib/queryClient";
import { contactKeys } from "../queries/contact.queries";
import { ledgerKeys } from "../queries/ledger.queries";
import { FETCH_GPC_X_API_KEY } from "../store/constants";
import { store } from "../store/store";
import { apiRequest, fetchGpc } from "./api";

let CURRENT_USER = {
  name: "GPC",
  description: "GPC",
};
export const setCurrentUser = (currentUser) => {
  CURRENT_USER = currentUser;
  return;
};
export const getCurrentUser = () => CURRENT_USER
export const updateActivity = async (email, last_activity) => {
  try {
    const data = await fetchGpc({
      method: "POST",
      params: { type: "last_activity" },
      body: {
        email,
        last_activity,
        last_user: CURRENT_USER?.name ?? "GPC",
        last_user_email: CURRENT_USER?.description ?? "GPC",
      },
    });
    showConsole && console.log("Activity Added", data);
    queryClient.invalidateQueries({ queryKey: contactKeys.all })
  } catch (error) {
    showConsole && console.log(error);
  }
};
export const createLedgerEntry = async ({
  email,
  thread_id,
  message_id,
  group = "General",
  items = [],
  reminder_type,
  websites = [],
  extraPayload = {},
}) => {
  try {
    const payload = {
      email,
      thread_id,
      message_id,
      group,
      item: items,

      // optional fields
      ...(reminder_type && { reminder_type }),
      ...(websites?.length > 0 && { websites }),

      // any future custom fields
      ...extraPayload,
    };

    const data = await fetchGpc({
      method: "POST",
      body: payload,
      params: { type: "make_ledger" },
    });

    showConsole && console.log("Ledger Created", data);
    queryClient.invalidateQueries({ queryKey: ledgerKeys.all })

    return data;
  } catch (error) {
    showConsole && console.log("Ledger API Failed", error);
    throw error;
  }
};

export const buildLedgerItem = ({
  status,
  detail,
  parent_name,
}) => ({
  status,
  detail,
  prompt_id: "",
  prompt_ledger_id: "",
  parent_id: "",
  parent_name,
  template_id: "",
  assigned_user_id: CURRENT_USER?.id || "",
});

export const applyHashtag = async ({
  domain = false,
  email,
  memo_no,
  method = "GET",
}) => {
  try {
    const { data } = await fetchGpc({
      method,
      params: { type: "hashtag", email, memo_no: memo_no, domain },
    });

    showConsole && console.log("Hashtag Applied", data);
    queryClient.invalidateQueries({ queryKey: contactKeys.all })
    return data;
  } catch (error) {
    showConsole && console.log("Hashtag API Failed", error);
  }
};



export const generatePDF = async (html, id = "invoice") => {
  try {
    const response = await fetchGpc({
      params: { type: 'get_pdf' },
      method: "POST",
      headers: {
        "X-Api-Key": FETCH_GPC_X_API_KEY,

        "Content-Type": "application/json",
      },
      body: { html, id },
    });

    if (!response.ok) {
      throw new Error("Failed to generate PDF");
    }

    // ✅ get blob directly
    const blob = await response.blob();

    // ✅ convert blob → file
    const file = new File([blob], `${id}.pdf`, {
      type: "application/pdf",
    });
    console.log("Converted File:", file);

    return file;
  } catch (error) {
    console.error("PDF generation error:", error);
    throw error;
  }
};

export const getRighteeUsers = async () => {
  const response = await apiRequest({ endpoint: "https://crm.outrightsystems.org/index.php?entryPoint=trynow&team_member=1", })
  return response.data ?? []
}
export const getStages = async () => {
  const data = await fetchGpc({ params: { type: 'machine_learning', stages: 1 } });
  return data ?? {}
}
export const getCRM = () =>
  store.getState()
    .user?.crmEndpoint
    ?.split("?")[0];