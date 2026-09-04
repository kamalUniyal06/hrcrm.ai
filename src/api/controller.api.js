import { fetchGpc } from "../services/api";
import { store } from "../store/store";
export const getControllers = () => fetchGpc({ method: "POST", params: { type: 'manage_gpc' }, body: { current_email: store.getState().user.user.email } });
export const toggleController = ({ id, value }) => fetchGpc({ method: "POST", params: { type: 'manage_gpc' }, body: { current_email: store.getState().user.user.email, id, value: value } });