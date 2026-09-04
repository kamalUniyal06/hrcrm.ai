import { showConsole } from "../assets/assets";
import { fetchGpc } from "../services/api";
import { setCurrentUser } from "../services/utils";
import { store } from "../store/store";

export const getAllUsers = async () => {
    const data = await fetchGpc({ params: { type: 'get_users' } });
    showConsole && console.log(`users data`, data);
    const currentUser = data.find((user) => user.description === store.getState().user.user.email);
    setCurrentUser(currentUser)
    return data ?? [];
}