import {
    MessageSquarePlus,
    Search,
} from "lucide-react";

import {
    useInternalChat,
} from "../context/InternalChatContext";

import ConversationItem from "./ConversationItem";

export default function ChatSidebar() {
    const {
        conversations,
        selectedUser,
        selectUser,
        openStartChat,
        isConversationsLoading,
    } = useInternalChat();

    return (
        <aside className="flex h-full min-h-0 w-full flex-col bg-card">
            {/* Header */}
            <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-4">
                <div>
                    <h2 className="text-lg font-semibold text-foreground">
                        Chats
                    </h2>

                    <p className="text-xs text-muted-foreground">
                        Internal conversations
                    </p>
                </div>

                <button
                    type="button"
                    onClick={openStartChat}
                    className="flex h-9 w-9 items-center justify-center rounded-lg bg-search-primary text-white transition hover:opacity-90"
                    title="Start new chat"
                >
                    <MessageSquarePlus
                        size={18}
                    />
                </button>
            </div>

            {/* Search */}
            <div className="shrink-0 border-b border-border p-3">
                <div className="flex items-center gap-2 rounded-lg bg-input-background px-3 py-2">
                    <Search
                        size={16}
                        className="shrink-0 text-muted-foreground"
                    />

                    <input
                        type="text"
                        placeholder="Search chats..."
                        className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
                    />
                </div>
            </div>

            {/* Conversations */}
            <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto p-2">
                {isConversationsLoading ? (
                    <div className="space-y-2 p-2">
                        {Array.from({
                            length: 6,
                        }).map(
                            (_, index) => (
                                <div
                                    key={
                                        index
                                    }
                                    className="h-16 animate-pulse rounded-lg bg-muted"
                                />
                            )
                        )}
                    </div>
                ) : conversations.length ===
                    0 ? (
                    <div className="flex h-full flex-col items-center justify-center px-6 text-center">
                        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                            <MessageSquarePlus
                                size={22}
                                className="text-muted-foreground"
                            />
                        </div>

                        <p className="text-sm font-medium text-foreground">
                            No conversations
                            yet
                        </p>

                        <p className="mt-1 text-xs text-muted-foreground">
                            Start a new chat
                            with a CRM user.
                        </p>
                    </div>
                ) : (
                    conversations.map(
                        (
                            conversation
                        ) => (
                            <ConversationItem
                                key={
                                    conversation.user_id ??
                                    conversation.email
                                }
                                conversation={
                                    conversation
                                }
                                selected={
                                    selectedUser?.email ===
                                    conversation.email
                                }
                                onClick={() =>
                                    selectUser(
                                        conversation
                                    )
                                }
                            />
                        )
                    )
                )}
            </div>
        </aside>
    );
}