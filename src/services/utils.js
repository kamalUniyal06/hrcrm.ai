
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

export const LeaveApplications = {
  "schemaVersion": "1.0",
  "configVersion": "leave-applications-v1",
  "module": "hrc_leaves",
  "moduleKey": "leave-applications",
  "label": "Leave Applications",

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
export const LeavesHistory = {
  schemaVersion: "1.0",
  configVersion: "leaves-history-v2",
  module: "hrc_leave_transaction",
  moduleKey: "leaves-history",
  label: "Leaves History",

  config: {
    view: {
      available: ["table"],
    },

    statusConfig: [],

    filterColumns: [
      {
        label: "Leave Status",
        accessor: "leave_status",
        type: "select",
        multiple: true,
        values: [
          {
            label: "Planned Leave",
            value: "planned_leave",
          },
          {
            label: "Unplanned Leave",
            value: "unplanned_leave",
          },
          {
            label: "Sick Leave",
            value: "sick_leave",
          },
          {
            label: "Early Departure",
            value: "early_departure",
          },
          {
            label: "Emergency Leave",
            value: "emergency_leave",
          },
        ],
      },

      {
        label: "Leave Type",
        accessor: "leave_type",
        type: "select",
        multiple: true,
        values: [
          {
            label: "Full Day",
            value: "full_day",
          },
          {
            label: "Half Day",
            value: "half_day",
          },
        ],
      },

      {
        label: "Action",
        accessor: "leave_action",
        type: "select",
        multiple: true,
        values: [
          {
            label: "Debit",
            value: "debit",
          },
          {
            label: "Credit",
            value: "credit",
          },
        ],
      },

      {
        label: "Paid",
        accessor: "pay",
        type: "select",
        multiple: true,
        values: [
          {
            label: "Paid",
            value: "1",
          },
          {
            label: "Unpaid",
            value: "0",
          },
        ],
      },
    ],

    search: {
      enabled: true,
      fields: [
        "leave_status",
        "leave_type",
        "leave_action",
      ],
      operators: [
        "contains",
        "starts_with",
        "equals",
      ],
      placeholder: "Search leave history...",
    },

    sorting: {
      allowedFields: [
        "date_entered",
        "leave_type",
        "leave_status",
        "leave_action",
        "pay",
      ],
      directions: ["asc", "desc"],
      enabled: true,
    },

    pagination: {
      enabled: true,
      perPageOptions: [10, 25, 50, 100],
    },

    selection: {
      enabled: true,
      multiple: true,
    },

    columns: [
      {
        weight: 1.2,
        classes: "truncate",
        editable: false,
        maxWidth: 220,
        minWidth: 160,
        resizable: true,
        searchable: false,
        sortable: true,
        width: 180,
        accessor: "date_entered_time_ago",
        label: "Date",
        type: "text",
        display: {
          type: "text",
          value: "date_entered_time_ago",
        },
      },

      {
        weight: 1.2,
        classes: "truncate",
        editable: false,
        maxWidth: 180,
        minWidth: 130,
        resizable: true,
        searchable: true,
        sortable: true,
        width: 150,
        accessor: "leave_type",
        label: "Leave Type",
        type: "text",
        display: {
          type: "text",
          value: "leave_type",
        },
      },

      {
        weight: 1.5,
        classes: "truncate",
        editable: false,
        maxWidth: 220,
        minWidth: 160,
        resizable: true,
        searchable: true,
        sortable: true,
        width: 190,
        accessor: "leave_status",
        label: "Leave Status",
        type: "text",
        display: {
          type: "text",
          value: "leave_status",
        },
      },

      {
        weight: 1,
        classes: "truncate",
        editable: false,
        maxWidth: 150,
        minWidth: 110,
        resizable: true,
        searchable: true,
        sortable: true,
        width: 130,
        accessor: "leave_action",
        label: "Action",
        type: "text",
        display: {
          type: "text",
          value: "leave_action",
        },
      },

      {
        weight: 0.8,
        classes: "truncate",
        editable: false,
        maxWidth: 130,
        minWidth: 100,
        resizable: true,
        searchable: false,
        sortable: true,
        width: 110,
        accessor: "pay",
        label: "Pay",
        type: "text",
        display: {
          type: "text",
          value: "pay",
        },
      },
    ],

    bulkActions: [],
  },

  current: {
    view: "table",

    filters: {},

    search: {
      value: "",
      fields: [],
    },

    sorting: {
      order_by: "date_entered",
      order_dir: "desc",
    },

    pagination: {
      page: 1,
      per_page: 25,
    },

    hiddenColumns: [],

    selectedRows: [],
  },
};