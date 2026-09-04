import {
    ArrowDownLeft,
    CheckCheck,
} from "lucide-react";

import {
    useContext,
} from "react";

import {
    SocketContext,
} from "../../../../context/SocketContext";

export default function ConversationItem({
    conversation,
    selected,
    onClick,
}) {
    const {
        activeUsers = [],
        unseenChatCounts = {},
        clearUnseenChatCount,
    } = useContext(SocketContext);
    const name =
        conversation?.name ||
        conversation?.email ||
        "Unknown User";

    const email =
        conversation?.email || "";

    const normalizedEmail =
        email?.toLowerCase();

    /* ==========================================
       ONLINE STATUS
    ========================================== */

    const activeUser =
        activeUsers.find(
            (user) =>
                user?.email?.toLowerCase() ===
                normalizedEmail
        );

    const isOnline =
        activeUser?.status === "online";

    /* ==========================================
       UNSEEN CHAT COUNT

       This comes from SocketContext.
    ========================================== */

    const unseen =
        unseenChatCounts?.[email] ??
        unseenChatCounts?.[normalizedEmail] ??
        0;

    const unseenMessages =
        Number(unseen) || 0;

    /* ==========================================
       INITIALS
    ========================================== */

    const initials =
        name
            .split(" ")
            .filter(Boolean)
            .slice(0, 2)
            .map(
                (item) =>
                    item?.[0]
            )
            .join("")
            .toUpperCase() || "?";

    /* ==========================================
       CLICK HANDLER

       Clear unseen count for this user first,
       then select the conversation.
    ========================================== */

    const handleClick = () => {
        if (email) {
            clearUnseenChatCount?.(
                email
            );
        }

        onClick?.();
    };

    return (
        <button
            type="button"
            onClick={handleClick}
            className={`
                flex
                w-full
                items-center
                gap-3
                rounded-lg
                px-3
                py-3
                text-left
                transition

                ${selected
                    ? "bg-accent"
                    : "hover:bg-accent/70"
                }
            `}
        >
            {/* ==================================
                AVATAR
            ================================== */}

            <div
                className="
                    relative
                    flex
                    h-11
                    w-11
                    shrink-0
                    items-center
                    justify-center
                    rounded-full
                    bg-search-primary
                    text-sm
                    font-semibold
                    text-white
                "
            >
                {initials}

                {/* Online / Offline indicator */}

                <span
                    title={
                        isOnline
                            ? "Online"
                            : "Offline"
                    }
                    className={`
                        absolute
                        bottom-0
                        right-0
                        h-3
                        w-3
                        rounded-full
                        border-2
                        border-card

                        ${isOnline
                            ? "bg-emerald-500"
                            : "bg-muted-foreground/40"
                        }
                    `}
                />
            </div>

            {/* ==================================
                CONTENT
            ================================== */}

            <div className="min-w-0 flex-1">
                {/* Name + Date */}

                <div className="flex items-center justify-between gap-2">
                    <p
                        className={`
                            min-w-0
                            truncate
                            text-sm
                            ${unseenMessages > 0
                                ? "font-bold text-foreground"
                                : "font-semibold text-foreground"
                            }
                        `}
                    >
                        {name}
                    </p>

                    {conversation?.last_message_date && (
                        <span
                            className={`
                                shrink-0
                                text-[10px]

                                ${unseenMessages > 0
                                    ? "font-medium text-search-primary"
                                    : "text-muted-foreground"
                                }
                            `}
                        >
                            {
                                conversation.last_message_date
                            }
                        </span>
                    )}
                </div>

                {/* Last Message */}
                <div className="mt-1 flex min-w-0 items-center gap-1">
                    {conversation?.latest_message?.direction === "received" ||
                        conversation?.latest_message?.direction === "inbound" ? (
                        <ArrowDownLeft
                            size={13}
                            className={`
                shrink-0
                ${unseenMessages > 0
                                    ? "text-search-primary"
                                    : "text-muted-foreground"
                                }
            `}
                        />
                    ) : (
                        <CheckCheck
                            size={13}
                            className={`
                shrink-0
                ${unseenMessages > 0
                                    ? "text-search-primary"
                                    : "text-muted-foreground"
                                }
            `}
                        />
                    )}

                    <p
                        className={`
            min-w-0
            truncate
            text-xs
            ${unseenMessages > 0
                                ? "font-medium text-foreground"
                                : "text-muted-foreground"
                            }
        `}
                    >
                        {conversation?.latest_message?.message || ""}
                    </p>
                </div>
            </div>

            {/* ==================================
                UNSEEN CHAT COUNT
            ================================== */}

            {unseenMessages > 0 && (
                <span
                    className="
                        flex
                        h-5
                        min-w-5
                        shrink-0
                        items-center
                        justify-center
                        rounded-full
                        bg-search-primary
                        px-1.5
                        text-[10px]
                        font-semibold
                        text-white
                    "
                >
                    {
                        unseenMessages > 99
                            ? "99+"
                            : unseenMessages
                    }
                </span>
            )}
        </button>
    );
}