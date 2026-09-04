import {
    useInfiniteQuery,
    useMutation,
    useQuery,
} from "@tanstack/react-query";

import {
    getAllConversations,
    getUserChat,
    sendMessage
} from "../api/internalChats.api";

export const chatKeys = {
    all: ["chat"],

    lists: () => [
        "chat",
        "list",
    ],
    userChat: (to_email) => [
        "chat",
        to_email
    ],

};


export const useGetConversations =
    () =>
        useQuery({
            queryKey: chatKeys.lists(),

            queryFn: () => getAllConversations(),

            staleTime:
                0,
        });
export const useGetUserChat = ({ to_email } = {}) => {


    return useQuery({
        queryKey: chatKeys.userChat(to_email),

        queryFn: async () => {
            const response =
                await getUserChat({
                    to_email,
                });



            return response;
        },

        enabled: !!to_email,

        staleTime: 0,

    });


};
export const useSendInternalMessage = () => {
    return useMutation({
        mutationFn: ({
            to_email,
            message,
        }) =>
            sendMessage({
                to_email,
                message,
            }),
    });
};