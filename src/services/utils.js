
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
export const getCRM = () =>
  store.getState()
    .user?.crmEndpoint
    ?.split("?")[0];