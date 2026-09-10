import { useQuery } from "@tanstack/react-query";
import { getAllUsers, getUserInfo } from "../api/users.api";
import { store } from "@/store/store";
export const userKeys = {
    all: ["users"],

    lists: [
        "users",
        "list",
    ],

    byId: (id) => [
        "users",
        "id",
        id,
    ],
    info: (email) => [
        "users",
        "email",
        email,
    ],
};
export const useCrmUsers = () =>
    useQuery({
        queryKey: userKeys.lists,
        queryFn: getAllUsers,
    });

export const useUserInfo = () =>
    useQuery({
        queryKey: userKeys.info(store.getState().user.user.email),
        queryFn: getUserInfo,
    });

