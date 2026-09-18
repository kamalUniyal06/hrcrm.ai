
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

export const getRighteeUsers = async () => {
  const response = await apiRequest({ endpoint: "https://crm.outrightsystems.org/index.php?entryPoint=trynow&team_member=1", })
  return response.data ?? []
}
export const getStages = async () => {
  const data = await fetchGpc({ params: { type: 'machine_learning', stages: 1 } });
  return data ?? {}
}
export const getCRM = "https://flight.hrcrm.ai/index.php";

export const LeaveHistory = {
  "schemaVersion": "1.0",
  "configVersion": "leave-history-v1",
  "module": "hrc_leaves",
  "moduleKey": "leave-history",
  "label": "Leave History",

  "config": {
    "view": {
      "available": [
        "table"
      ]
    },

    "statusConfig": [],

    "filterColumns": [
      {
        "label": "Status",
        "accessor": "status",
        "type": "select",
        "multiple": true,
        "values": [
          {
            "label": "Applied",
            "value": "applied"
          },
          {
            "label": "Approved",
            "value": "approved"
          },
          {
            "label": "Rejected",
            "value": "rejected"
          },
          {
            "label": "Cancelled",
            "value": "cancelled"
          }
        ]
      },
      {
        "label": "Leave Type",
        "accessor": "type_of_leave",
        "type": "select",
        "multiple": true,
        "values": [
          {
            "label": "Sick Leave",
            "value": "sick"
          },
          {
            "label": "Annual Leave",
            "value": "annual"
          },
          {
            "label": "Casual Leave",
            "value": "casual"
          },
          {
            "label": "Paid Leave",
            "value": "paid"
          }
        ]
      }
    ],

    "search": {
      "enabled": true,
      "fields": [
        "type_of_leave",
        "status"
      ],
      "operators": [
        "contains",
        "starts_with",
        "equals"
      ],
      "placeholder": "Search leave history..."
    },

    "sorting": {
      "allowedFields": [
        "type_of_leave",
        "leave_from",
        "leave_to",
        "status",
        "date_entered"
      ],
      "directions": [
        "asc",
        "desc"
      ],
      "enabled": true
    },

    "pagination": {
      "enabled": true,
      "perPageOptions": [
        10,
        25,
        50,
        100
      ]
    },

    "selection": {
      "enabled": true,
      "multiple": true
    },

    "columns": [
      {
        "weight": 1.5,
        "classes": "truncate",
        "editable": false,
        "maxWidth": 350,
        "minWidth": 180,
        "resizable": true,
        "searchable": true,
        "sortable": true,
        "width": 240,
        "accessor": "type_of_leave",
        "label": "Leave Type",
        "type": "text"
      },

      {
        "weight": 1,
        "editable": false,
        "maxWidth": 180,
        "minWidth": 120,
        "resizable": true,
        "searchable": false,
        "sortable": true,
        "width": 150,
        "accessor": "leave_days",
        "label": "Duration",
        "type": "text",
        "display": {
          "type": "text",
          "value": "leave_days"
        }
      },

      {
        "weight": 1.2,
        "editable": false,
        "maxWidth": 200,
        "minWidth": 140,
        "resizable": true,
        "searchable": false,
        "sortable": true,
        "width": 170,
        "accessor": "leave_from",
        "label": "Start Date",
        "type": "date"
      },

      {
        "weight": 1.2,
        "editable": false,
        "maxWidth": 200,
        "minWidth": 140,
        "resizable": true,
        "searchable": false,
        "sortable": true,
        "width": 170,
        "accessor": "leave_to",
        "label": "End Date",
        "type": "date"
      },
      {
        "weight": 1,
        "editable": false,
        "maxWidth": 350,
        "minWidth": 250,
        "resizable": true,
        "searchable": true,
        "sortable": true,
        "width": 250,
        "accessor": "description",
        "label": "Description",
        "type": "text"
      },

      {
        "weight": 1,
        "editable": false,
        "maxWidth": 180,
        "minWidth": 120,
        "resizable": true,
        "searchable": true,
        "sortable": true,
        "width": 150,
        "accessor": "status",
        "label": "Status",
        "type": "text"
      },


    ],

    "bulkActions": []
  },

  "current": {
    "view": "table",
    "filters": {},
    "search": {
      "value": "",
      "fields": []
    },
    "sorting": {
      "order_by": "",
      "order_dir": "desc"
    },
    "pagination": {
      "page": 1,
      "per_page": 25
    },
    "hiddenColumns": [],
    "selectedRows": []
  }
}