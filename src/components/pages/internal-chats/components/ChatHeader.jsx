import {
    ArrowLeft,
    MoreVertical,
    Phone,
    Video,
} from "lucide-react";

import {
    useInternalChat,
} from "../context/InternalChatContext";

export default function ChatHeader() {
    const {
        selectedUser,
        clearSelectedUser,
    } = useInternalChat();

    if (!selectedUser) {
        return (
            <div className="flex h-[73px] shrink-0 items-center border-b border-border px-5">
                <div>
                    <h2 className="text-sm font-semibold text-foreground">
                        Internal Chat
                    </h2>

                    <p className="text-xs text-muted-foreground">
                        Select a conversation to
                        start chatting
                    </p>
                </div>
            </div>
        );
    }

    const name =
        selectedUser.name ||
        selectedUser.email ||
        "User";

    const initials =
        name
            .split(" ")
            .filter(Boolean)
            .slice(0, 2)
            .map(
                (item) =>
                    item[0]
            )
            .join("")
            .toUpperCase();

    return (
        <header className="flex h-[73px] shrink-0 items-center justify-between border-b border-border bg-card px-4">
            <div className="flex min-w-0 items-center gap-3">
                <button
                    type="button"
                    onClick={
                        clearSelectedUser
                    }
                    className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-accent md:hidden"
                >
                    <ArrowLeft
                        size={18}
                    />
                </button>

                <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-search-primary text-sm font-semibold text-white">
                    {initials}

                    <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-card bg-emerald-500" />
                </div>

                <div className="min-w-0">
                    <h3 className="truncate text-sm font-semibold text-foreground">
                        {name}
                    </h3>

                    <p className="truncate text-xs text-muted-foreground">
                        {selectedUser.email}
                    </p>
                </div>
            </div>

        </header>
    );
}