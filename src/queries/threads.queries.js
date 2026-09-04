import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getDuplicateThreads, getMessageById, getThreadByEmail, getThreadByThreadId } from "../api/threads.api";
export const threadKeys =
{
    all: ["threads",],
    list: (email, threadId) => ["threads", email, threadId],
    duplicate: (email) => ["threads", "duplicate", email],
    messageKey: (id) => ['message', id]
};

export const useThread = (email, threadId = "") => {
    const queryClient = useQueryClient();

    return useQuery({
        queryKey: threadKeys.list(email, threadId ?? ""),
        queryFn: async () => {
            const data = threadId
                ? await getThreadByThreadId(email, threadId)
                : await getThreadByEmail(email);

            if (!threadId && data?.thread_id) {
                queryClient.setQueryData(
                    threadKeys.list(email, data.thread_id),
                    data
                );
            }

            return data;
        },
        enabled: Boolean(email),
    });
};
export const useMessage = (id) => {
    return useQuery({
        queryKey: threadKeys.messageKey(id),
        queryFn: () => getMessageById(id),
        enabled: Boolean(id),
    });
};
export const useDuplicateThreads = (email) =>
    useQuery({
        queryKey: threadKeys.duplicate(email),
        queryFn: () => getDuplicateThreads(email),
        enabled: Boolean(email),
    });