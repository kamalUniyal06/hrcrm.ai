import { useQuery } from "@tanstack/react-query";
import { getAllUsers } from "../api/users.api";
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
};
export const useCrmUsers = () =>
    useQuery({
        queryKey: userKeys.lists,
        queryFn: getAllUsers,
    });


