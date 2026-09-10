
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

export const employeSidebar = {
  "status": true,
  "level": "module",
  "group_count": 1,
  "total_modules": 6,
  "data": [
    {
      "group_name": "Employee Management",
      "id": "341faf31-973e-4938-e19b-6aa18d491c3d",
      "rank": "a3",
      "group_priority": "a3",
      "is_active": true,
      "count": 6,
      "module": "outr_ui_groups",
      "data": [
        {
          "id": "451faf31-973e-4938-e19b-6aa18d491c3d",
          "name": "Leave",
          "module": "outr_ui_modules",
          "group_id": "341faf31-973e-4938-e19b-6aa18d491c3d",
          "group_name": "Employee Management",
          "module_name": "Leave",
          "library": "fa",
          "icon": "FaUmbrellaBeach",
          "key": "leave",
          "data_filters": [],
          "count_filters": [],
          "filter_by_email": "0",
          "count_email_req": 0,
          "navigation": "/leaves",
          "rank": "Za",
          "visible": true,
          "description": "",
          "is_active": "1"
        },
        {
          "id": "461faf31-973e-4938-e19b-6aa18d491c3d",
          "name": "Attendance",
          "module": "outr_ui_modules",
          "group_id": "341faf31-973e-4938-e19b-6aa18d491c3d",
          "group_name": "Employee Management",
          "module_name": "Attendance",
          "library": "fa",
          "icon": "FaCalendarCheck",
          "key": "attendance",
          "data_filters": [],
          "count_filters": [],
          "filter_by_email": "0",
          "count_email_req": 0,
          "navigation": "/attendance",
          "rank": "Zb",
          "visible": true,
          "description": "",
          "is_active": "1"
        },
        {
          "id": "471faf31-973e-4938-e19b-6aa18d491c3d",
          "name": "Performance",
          "module": "outr_ui_modules",
          "group_id": "341faf31-973e-4938-e19b-6aa18d491c3d",
          "group_name": "Employee Management",
          "module_name": "Performance",
          "library": "fa",
          "icon": "FaChartLine",
          "key": "performance",
          "data_filters": [],
          "count_filters": [],
          "filter_by_email": "0",
          "count_email_req": 0,
          "navigation": "/performance",
          "rank": "Zc",
          "visible": true,
          "description": "",
          "is_active": "1"
        },
        {
          "id": "481faf31-973e-4938-e19b-6aa18d491c3d",
          "name": "Results",
          "module": "outr_ui_modules",
          "group_id": "341faf31-973e-4938-e19b-6aa18d491c3d",
          "group_name": "Employee Management",
          "module_name": "Results",
          "library": "fa",
          "icon": "FaPoll",
          "key": "results",
          "data_filters": [],
          "count_filters": [],
          "filter_by_email": "0",
          "count_email_req": 0,
          "navigation": "/results",
          "rank": "Zd",
          "visible": true,
          "description": "",
          "is_active": "1"
        },
        {
          "id": "491faf31-973e-4938-e19b-6aa18d491c3d",
          "name": "Messages",
          "module": "outr_ui_modules",
          "group_id": "341faf31-973e-4938-e19b-6aa18d491c3d",
          "group_name": "Employee Management",
          "module_name": "Messages",
          "library": "fa",
          "icon": "FaRegCommentDots",
          "key": "messages",
          "data_filters": [],
          "count_filters": [],
          "filter_by_email": "0",
          "count_email_req": 0,
          "navigation": "/entity/messages/list/table",
          "rank": "Ze",
          "visible": true,
          "description": "",
          "is_active": "1"
        },
        {
          "id": "501faf31-973e-4938-e19b-6aa18d491c3d",
          "name": "Calendar",
          "module": "outr_ui_modules",
          "group_id": "341faf31-973e-4938-e19b-6aa18d491c3d",
          "group_name": "Employee Management",
          "module_name": "Calendar",
          "library": "fa",
          "icon": "FaCalendarAlt",
          "key": "calendar",
          "data_filters": [],
          "count_filters": [],
          "filter_by_email": "0",
          "count_email_req": 0,
          "navigation": "/entity/calendar/list/table",
          "rank": "Zf",
          "visible": true,
          "description": "",
          "is_active": "1"
        }
      ]
    }
  ]
}