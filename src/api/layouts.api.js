import { apiRequest } from "@/services/api";
import { LeaveHistory } from "../services/utils";

export const getDetailLayout = () => ({
    "schemaVersion": "1.0",
    "configVersion": "1",
    "module": "OutrOffer",
    "moduleKey": "outr_offer",
    "sourceModule": "OutrOffer",
    "label": "Offer",
    "viewKey": "detail",
    "availableViewKeys": [
        "create",
        "detail",
        "edit"
    ],
    "layout": "detail",

    "request": {
        "endpoint": "smartgateway",
        "method": "POST",
        "body": {
            "action": "fetch",
            "module": "outr_offers",

        }
    },

    "navigation": {
        "enabled": true,
        "idField": "id",
        "next": {
            "enabled": true
        },
        "previous": {
            "enabled": true
        },
        "source": "list"
    },

    "header": {
        "id": "offer_header",
        "module": "outr_offer",
        "type": "header",

        "titleField": {

            "accessor": "website"
        },

        "actions": [
            {
                "icon": {
                    "color": "",
                    "library": "fi",
                    "name": "FiEdit2"
                },
                "placement": "primary",
                "target": "edit",
                "targetType": "relative",
                "id": "edit",
                "label": "Edit",
                "type": "navigate"
            }
        ]
    },

    "blocks": [
        {

            "id": "offer_information",
            "module": "outr_offer",
            "title": "Offer Information",
            "type": "section",
            "columns": 2,
            "editable": true,

            "source": {
                "beanModule": "OutrOffer",
                "label": "Offer",
                "module": "outr_offer",
            },

            "fields": [
                {
                    "editable": false,
                    "readonly": true,
                    "visible": true,
                    "accessor": "date_modified_time_ago",
                    "label": "Created At",
                    "type": "text"
                },
                {
                    "editable": true,
                    "readonly": false,
                    "visible": true,
                    "accessor": "website",
                    "label": "Website",
                    "type": "url"
                },
                {
                    "editable": true,
                    "readonly": false,
                    "visible": true,
                    "accessor": "client_offer_c",
                    "label": "Client Offer",
                    "type": "currency"
                },
                {
                    "editable": true,
                    "readonly": false,
                    "visible": true,
                    "accessor": "our_offer_c",
                    "label": "Our Offer",
                    "type": "currency"
                }
            ]
        }

    ]
});

export const getLayout = async (module = 'orders', view_key = "table") => {
    const data = LeaveHistory
    return data;
}