import {
    Loader2,
    MessageCircle,
} from "lucide-react";

import {
    useInternalChat,
} from "../context/InternalChatContext";
import { getCurrentUser } from "../../../../services/utils";

export default function ChatMessages() {
    const {
        selectedUser,
        messages,
        isMessagesLoading,
    } = useInternalChat();
    console.log("message", messages)

    /*
     * ==========================================
     * NO USER SELECTED
     * ==========================================
     *
     * h-full + flex-1 makes the empty state
     * consume the COMPLETE available area.
     */
    if (!selectedUser) {
        return (
            <div
                className="
        flex
        h-full
        min-h-0
        p-10
        flex-1
        items-center
        justify-center
        overflow-y-auto
        custom-scrollbar
        bg-background
    "
            >                 <div className="flex flex-col items-center justify-center px-6 text-center">
                    <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-card shadow-sm">
                        <MessageCircle
                            size={25}
                            className="text-search-primary"
                        />
                    </div>

                    <h3 className="text-sm font-semibold text-foreground">
                        Your messages
                    </h3>

                    <p className="mt-1 max-w-xs text-xs text-muted-foreground">
                        Select a user from the left
                        to view the conversation.
                    </p>
                </div>
            </div>
        );
    }

    /*
     * ==========================================
     * LOADING
     * ==========================================
     */

    if (isMessagesLoading) {
        return (
            <div
                className="
        flex
        h-full
        min-h-0
        p-10
        flex-1
        items-center
        justify-center
        overflow-y-auto
        custom-scrollbar
        bg-background
    "
            >                  <Loader2
                    size={22}
                    className="animate-spin text-search-primary"
                />
            </div>
        );
    }

    /*
     * ==========================================
     * MESSAGES
     * ==========================================
     */

    return (
        <div
            className="
        flex
        h-[69vh]
        min-h-0
        p-10
        flex-1
        flex-col
        overflow-y-auto
        custom-scrollbar
        bg-background
    "
        >           {messages.length === 0 ? (
            <div className="flex h-full items-center justify-center">
                <div className="text-center">
                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-card shadow-sm">
                        <MessageCircle
                            size={21}
                            className="text-muted-foreground"
                        />
                    </div>

                    <p className="text-sm font-medium text-foreground">
                        No messages yet
                    </p>

                    <p className="mt-1 text-xs text-muted-foreground">
                        Send a message to start
                        the conversation.
                    </p>
                </div>
            </div>
        ) : (
            <div className="mx-auto flex w-full max-w-4xl flex-col gap-3">
                {messages.map(
                    (message, index) => (
                        <MessageBubble
                            key={
                                message?.id ??
                                message?.message_id ??
                                index
                            }
                            message={
                                message
                            }
                        />
                    )
                )}
            </div>
        )}
        </div>
    );
}


/* ==========================================
   MESSAGE BUBBLE
========================================== */

function MessageBubble({
    message,
}) {
    const isMine =

        message?.from ===
        getCurrentUser()?.description;

    const text =
        message?.message ??
        message?.body ??
        message?.content ??
        "";

    return (
        <div
            className={`flex ${isMine
                ? "justify-end"
                : "justify-start"
                }`}
        >
            <div
                className={`
                    max-w-[80%]
                    rounded-2xl
                    px-4
                    py-2.5

                    ${isMine
                        ? "rounded-br-md bg-search-primary text-white"
                        : "rounded-bl-md bg-card text-foreground shadow-sm"
                    }
                `}
            >
                <p className="whitespace-pre-wrap break-words text-sm">
                    {text}
                </p>

                {message?.created_at && (
                    <p
                        className={`
                            mt-1 text-[10px]

                            ${isMine
                                ? "text-white/70"
                                : "text-muted-foreground"
                            }
                        `}
                    >
                        {message.created_at}
                    </p>
                )}
            </div>
        </div>
    );
}