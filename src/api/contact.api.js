import toast from "react-hot-toast";
import { apiRequest, fetchGpc, http } from "../services/api";
import { buildTableRequestBody } from "../utils/preferenceStorage";
import { queryClient } from "../lib/queryClient";
import { contactKeys } from "../queries/contact.queries";
import { favoriteKeys } from "../queries/favourite.queries";
import { getCRM, updateActivity } from "../services/utils";

// contact.api.js

export const getContactStats = async (
    filters = {}
) => {
    return http({
        method: "POST",
        body: {
            action: "get_stats",
            ...buildTableRequestBody(filters),
            queries: [
                {
                    "key": "new",
                    "module": "Contacts",
                    "filters": {
                        "stage": "new"
                    }
                },
                {
                    "key": "offer",
                    "module": "Contacts",
                    "filters": {
                        "stage": "offer"
                    }
                },
                {
                    "key": "order",
                    "module": "Contacts",
                    "filters": {
                        "stage": "order"
                    }
                },
                {
                    "key": "deal",
                    "module": "Contacts",
                    "filters": {
                        "stage": "deal"
                    }
                },
                {
                    "key": "all",
                    "module": "Contacts"
                },
                {
                    "key": "unverified",
                    "module": "Contacts",
                    "filters": {
                        "customer_type": "unverified"
                    }
                },
                {
                    "key": "verified",
                    "module": "Contacts",
                    "filters": {
                        "customer_type": "verified"
                    }
                },
                {
                    "key": "defaulter",
                    "module": "Contacts",
                    "filters": {
                        "customer_type": "defaulter"
                    }
                },
                {
                    "key": "inbound",
                    "module": "Contacts",
                    "filters": {
                        "direction": "inbound",
                        "conversation_complete": {
                            "neq": "1"
                        }
                    }
                },
                {
                    "key": "outbound",
                    "module": "Contacts",
                    "filters": {
                        "direction": "outbound",
                    }
                },
                {
                    "key": "Brand",
                    "module": "Contacts",
                    "filters": {
                        "type": "Brand"
                    }
                },
                {
                    "key": "completed",
                    "module": "Contacts",
                    "filters": {
                        "conversation_complete": "1"
                    }
                },
                {
                    "key": "stop",
                    "module": "Contacts",
                    "filters": {
                        "is_stop": "1"
                    }
                },
                {
                    "key": "forwarded",
                    "module": "Contacts",
                    "filters": {
                        "forwarded": "1",
                        "direction": "inbound"
                    }
                },
                {
                    "key": "favorite",
                    "module": "Contacts",
                    "filters": {
                        "favorite": "1",
                        "direction": "inbound"
                    }
                },
                {
                    "key": "exchange",
                    "module": "Contacts",
                    "filters": {
                        "exchange": "1"
                    }
                }


            ]
        },
    });
};
/**
 * Get paginated contact list
 */
export const getAllContacts = async ({
    page = 1,
    preferences,
    defaults = {}
} = {}) => {
    const data = await http({
        method: "POST",
        body: {
            "action": "fetch",
            "module": "Contacts",
            "page": page,
            "per_page": 20,
            ...buildTableRequestBody(preferences, defaults)
        }
    });
    return data;
};
export const getAllUnreadEmails = async ({
    page = 1,
    per_page = 20
} = {}) => {
    const data = await fetchGpc({ params: { type: 'email_unread', page, per_page } })
    return data;
};
export const getUnreadCount = async () => {
    const data = await fetchGpc({ params: { type: "email_stats" } });
    console.log("UNREAD COUNT", data?.data?.unread)
    return data?.data?.unread;
};

/**
 * Get single contact by email
 */
export const getContactByEmail = async (email) => {
    if (!email) {
        throw new Error("Email is required");
    }
    const response = await fetchGpc({ params: { type: "get_contact", email } });
    return response;
};

/**
 * Create a contact from the timeline empty state.
 */
export const createContactFromEmail = (payload) =>
    fetchGpc({
        method: "POST",
        params: { type: "create_contact" },
        body: payload,
    });

/**
 * Create contact
 */
export const createContact = async (payload) => {
    const response = await http({
        method: "POST",

        body: {
            "action": "create",
            "module": "Contacts", data: { ...payload }
        },
    });

    return response;
};

/**
 * Update contact
 */
export const updateContact = async ({
    id,
    payload,
}) => {
    console.log("ID", id)
    console.log("PAYLOAD", payload)
    const response = await http({
        method: "POST",
        body: {
            module: "Contacts",
            action: "update",
            id,
            data: { ...payload }
        },
    });

    return response;
};
export const updateAccount = async ({
    id,
    payload,
}) => {
    const response = await http({
        method: "POST",
        body: {
            module: "Accounts",
            action: "update",
            id,
            data: { ...payload }
        },
    });

    return response;
};
export const toggleFav = async ({ threadId, email }) => {
    const data = await apiRequest({ endpoint: `${getCRM()}?entryPoint=contactAction`, params: { field: 'favorite', email } });
    console.log(`Favourite Toggle data`, data)
    const isFavorite = Number(data?.new_value) === 1;
    toast.success(
        isFavorite
            ? "❤️ Email Favorited Successfully"
            : "🤍 Email Unfavorited Successfully"
    );
    updateActivity(email, isFavorite ? "Email Favorited " : "Email Unfavorited ");
    queryClient.invalidateQueries({ queryKey: contactKeys.all })
    queryClient.invalidateQueries({ queryKey: favoriteKeys.all })
    //LADGER ENTRY

}
