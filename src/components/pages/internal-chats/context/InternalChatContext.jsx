import {
    createContext,
    useContext,
    useEffect,
    useMemo,
    useState,
} from "react";

import {
    useSearchParams,
} from "react-router-dom";

import {
    useGetConversations,
    useGetUserChat,
    useSendInternalMessage,
} from "../../../../queries/internalChat.queries";

import {
    useCrmUsers,
} from "../../../../queries/users.queries";


const InternalChatContext = createContext(null);


export const InternalChatProvider = ({
    children,
}) => {
    /* ==========================================
       URL SEARCH PARAMS
    ========================================== */

    const [
        searchParams,
        setSearchParams,
    ] = useSearchParams();


    const emailFromUrl =
        searchParams.get("email");


    /* ==========================================
       SELECTED USER
    ========================================== */

    const [
        selectedUser,
        setSelectedUser,
    ] = useState(null);


    /* ==========================================
       START CHAT MODAL
    ========================================== */

    const [
        isStartChatOpen,
        setIsStartChatOpen,
    ] = useState(false);


    /* ==========================================
       MESSAGE INPUT
    ========================================== */

    const [
        message,
        setMessage,
    ] = useState("");


    /* ==========================================
       CONVERSATIONS
    ========================================== */

    const conversationsQuery =
        useGetConversations();

    const conversations =
        conversationsQuery.data?.chats ?? [];


    /* ==========================================
       ALL CRM USERS
    ========================================== */

    const usersQuery =
        useCrmUsers();

    const users = useMemo(() => {
        const data =
            usersQuery.data;

        if (Array.isArray(data)) {
            return data;
        }

        return [];
    }, [usersQuery.data]);


    /* ==========================================
       FIND USER BY EMAIL
       
       We can receive email in URL:
       
       /internal-chat?email=user@example.com
       
       or:
       
       /internal-chat/user@example.com
       
       depending on your routing.
    ========================================== */

    const findUserByEmail = (
        email
    ) => {
        if (!email) {
            return null;
        }

        const normalizedEmail =
            email
                .trim()
                .toLowerCase();

        /* ------------------------------
           Search CRM users
        ------------------------------ */

        const crmUser =
            users.find(
                (user) =>
                    (
                        user?.description ??
                        user?.email ??
                        ""
                    )
                        .toLowerCase() ===
                    normalizedEmail
            );

        if (crmUser) {
            return {
                email:
                    crmUser?.description ??
                    crmUser?.email,

                user_id:
                    crmUser?.id ??
                    crmUser?.user_id,

                name:
                    crmUser?.name ??
                    crmUser?.full_name ??
                    normalizedEmail,
            };
        }


        /* ------------------------------
           Search existing conversations
           
           This is useful when the user
           already has a conversation but
           is not returned by useCrmUsers.
        ------------------------------ */

        const conversation =
            conversations.find(
                (item) =>
                    (
                        item?.email ??
                        item?.to_email ??
                        item?.user_email ??
                        ""
                    )
                        .toLowerCase() ===
                    normalizedEmail
            );

        if (conversation) {
            return {
                ...conversation,

                email:
                    conversation?.email ??
                    conversation?.to_email ??
                    conversation?.user_email,

                user_id:
                    conversation?.user_id ??
                    conversation?.id,

                name:
                    conversation?.name ??
                    conversation?.user_name ??
                    normalizedEmail,
            };
        }


        /* ------------------------------
           Fallback
           
           Even if the user API has not
           loaded yet, we can still open
           the conversation using email.
        ------------------------------ */

        return {
            email: email.trim(),
            user_id: null,
            name: email.trim(),
        };
    };


    /* ==========================================
       SELECT USER FROM URL
       
       IMPORTANT:
       Do NOT put selectedUser in the
       dependency array here.
       
       Otherwise setSelectedUser() can
       continuously trigger the effect.
    ========================================== */

    useEffect(() => {
        if (!emailFromUrl) {
            return;
        }

        const user =
            findUserByEmail(
                emailFromUrl
            );

        if (!user?.email) {
            return;
        }

        setSelectedUser((previous) => {
            if (
                previous?.email?.toLowerCase() ===
                user.email.toLowerCase()
            ) {
                return previous;
            }

            return user;
        });

        setMessage("");
    }, [
        emailFromUrl,
        users,
        conversations,
    ]);


    /* ==========================================
       SELECTED USER CHAT
    ========================================== */

    const userChatQuery =
        useGetUserChat({
            to_email:
                selectedUser?.email,
        });


    const messages = useMemo(() => {
        const data =
            userChatQuery.data?.chats;

        if (Array.isArray(data)) {
            return data;
        }

        return [];
    }, [
        userChatQuery.data,
    ]);


    /* ==========================================
       SEND MESSAGE MUTATION
    ========================================== */

    const sendMessageMutation =
        useSendInternalMessage();


    /* ==========================================
       SELECT USER
    ========================================== */

    const selectUser = (
        user
    ) => {
        if (!user) {
            return;
        }

        const normalizedUser = {
            ...user,

            email:
                user?.email ??
                user?.description,

            user_id:
                user?.user_id ??
                user?.id,

            name:
                user?.name ??
                user?.full_name ??
                user?.email ??
                user?.description,
        };

        setSelectedUser(
            normalizedUser
        );

        setMessage("");

        /*
         * Keep URL in sync.
         *
         * This means selecting a user will
         * produce:
         *
         * /internal-chat?email=user@email.com
         */

        if (normalizedUser.email) {
            setSearchParams(
                {
                    email:
                        normalizedUser.email,
                },
                {
                    replace: true,
                }
            );
        }
    };


    /* ==========================================
       CLEAR SELECTED USER
    ========================================== */

    const clearSelectedUser = () => {
        setSelectedUser(null);
        setMessage("");

        /*
         * Remove email from URL.
         */

        setSearchParams(
            {},
            {
                replace: true,
            }
        );
    };


    /* ==========================================
       START CHAT MODAL
    ========================================== */

    const openStartChat = () => {
        setIsStartChatOpen(true);
    };


    const closeStartChat = () => {
        setIsStartChatOpen(false);
    };


    /* ==========================================
       START CHAT WITH USER
    ========================================== */

    const startChatWithUser = (
        user
    ) => {
        if (!user) {
            return;
        }

        const normalizedUser = {
            email:
                user?.email ??
                user?.description,

            user_id:
                user?.user_id ??
                user?.id,

            name:
                user?.name ??
                user?.full_name ??
                user?.email ??
                user?.description,
        };

        setSelectedUser(
            normalizedUser
        );

        setMessage("");

        setIsStartChatOpen(false);

        /*
         * Update URL.
         */

        if (normalizedUser.email) {
            setSearchParams(
                {
                    email:
                        normalizedUser.email,
                },
                {
                    replace: true,
                }
            );
        }
    };


    /* ==========================================
       SEND MESSAGE
       
       Receives:
       
       {
           to_email,
           message
       }
    ========================================== */

    const sendMessage = async ({
        to_email,
        message: messageText,
    }) => {
        const text =
            messageText?.trim();

        if (!text) {
            return;
        }

        if (!to_email) {
            return;
        }

        try {
            await sendMessageMutation.mutateAsync(
                {
                    to_email,
                    message: text,
                }
            );

            /*
             * Clear input only after
             * successful API call.
             */

            setMessage("");


            /*
             * Refetch current conversation.
             */

            await userChatQuery.refetch();


            /*
             * Refresh conversation list.
             */

            await conversationsQuery.refetch();

        } catch (error) {
            console.error(
                "Failed to send internal message:",
                error
            );
        }
    };


    /* ==========================================
       SEND CURRENT INPUT MESSAGE
    ========================================== */

    const sendCurrentMessage =
        async () => {
            if (
                !selectedUser?.email
            ) {
                return;
            }

            const text =
                message?.trim();

            if (!text) {
                return;
            }

            await sendMessage({
                to_email:
                    selectedUser.email,

                message:
                    text,
            });
        };


    /* ==========================================
       CONTEXT VALUE
    ========================================== */

    const value =
        useMemo(
            () => ({
                /* ------------------------------
                   URL
                ------------------------------ */

                emailFromUrl,


                /* ------------------------------
                   CONVERSATIONS
                ------------------------------ */

                conversations,

                isConversationsLoading:
                    conversationsQuery.isLoading,

                isConversationsFetching:
                    conversationsQuery.isFetching,

                conversationsError:
                    conversationsQuery.error,

                refetchConversations:
                    conversationsQuery.refetch,


                /* ------------------------------
                   ALL CRM USERS
                ------------------------------ */

                users,

                isUsersLoading:
                    usersQuery.isLoading,

                isUsersFetching:
                    usersQuery.isFetching,

                usersError:
                    usersQuery.error,

                refetchUsers:
                    usersQuery.refetch,


                /* ------------------------------
                   SELECTED USER
                ------------------------------ */

                selectedUser,

                setSelectedUser,

                selectUser,

                clearSelectedUser,

                startChatWithUser,


                /* ------------------------------
                   MESSAGES
                ------------------------------ */

                messages,

                isMessagesLoading:
                    userChatQuery.isLoading,

                isMessagesFetching:
                    userChatQuery.isFetching,

                messagesError:
                    userChatQuery.error,

                refetchMessages:
                    userChatQuery.refetch,


                /* ------------------------------
                   MESSAGE INPUT
                ------------------------------ */

                message,

                setMessage,


                /* ------------------------------
                   SEND MESSAGE
                ------------------------------ */

                sendMessage,

                sendCurrentMessage,

                isSendingMessage:
                    sendMessageMutation.isPending,

                sendMessageError:
                    sendMessageMutation.error,

                sendMessageSuccess:
                    sendMessageMutation.isSuccess,


                /* ------------------------------
                   START CHAT MODAL
                ------------------------------ */

                isStartChatOpen,

                openStartChat,

                closeStartChat,
            }),
            [
                emailFromUrl,

                conversations,

                conversationsQuery.isLoading,
                conversationsQuery.isFetching,
                conversationsQuery.error,
                conversationsQuery.refetch,

                users,

                usersQuery.isLoading,
                usersQuery.isFetching,
                usersQuery.error,
                usersQuery.refetch,

                selectedUser,

                messages,

                userChatQuery.isLoading,
                userChatQuery.isFetching,
                userChatQuery.error,
                userChatQuery.refetch,

                message,

                sendMessageMutation.isPending,
                sendMessageMutation.error,
                sendMessageMutation.isSuccess,

                isStartChatOpen,
            ]
        );


    return (
        <InternalChatContext.Provider
            value={value}
        >
            {children}
        </InternalChatContext.Provider>
    );
};


export const useInternalChat =
    () => {
        const context =
            useContext(
                InternalChatContext
            );

        if (!context) {
            throw new Error(
                "useInternalChat must be used inside InternalChatProvider"
            );
        }

        return context;
    };