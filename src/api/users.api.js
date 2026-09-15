import { Action } from "@radix-ui/react-alert-dialog";
import { showConsole } from "../assets/assets";
import { fetchGpc, http } from "../services/api";
import { store } from "../store/store";

export const getUserInfo = async () => http({
    method: "POST",
    body: {
        action: 'fetch',
        module: "hrc_employees",
        filters: { email1: store.getState().user.user.email },
    }
})