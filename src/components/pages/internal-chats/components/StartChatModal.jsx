import {
    Search,
    X,
} from "lucide-react";

import {
    useMemo,
    useState,
} from "react";

import {
    useInternalChat,
} from "../context/InternalChatContext";


export default function StartChatModal() {
    const {
        isStartChatOpen,
        closeStartChat,
        users,
        isUsersLoading,
        startChatWithUser,
    } = useInternalChat();


    const [searchTerm, setSearchTerm] = useState("");


    /*
     * Filter users based on search text.
     *
     * Searches through:
     * - name
     * - email
     * - description
     */
    const filteredUsers = useMemo(() => {
        const term = searchTerm
            .trim()
            .toLowerCase();

        if (!term) {
            return users ?? [];
        }

        return (users ?? []).filter((user) => {
            const name =
                String(user?.name ?? "")
                    .toLowerCase();

            const email =
                String(user?.email ?? "")
                    .toLowerCase();

            const description =
                String(user?.description ?? "")
                    .toLowerCase();

            return (
                name.includes(term) ||
                email.includes(term) ||
                description.includes(term)
            );
        });
    }, [users, searchTerm]);


    /*
     * Reset search when modal closes/opens.
     */
    const handleClose = () => {
        setSearchTerm("");
        closeStartChat();
    };


    if (!isStartChatOpen) {
        return null;
    }


    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">

            <div className="flex max-h-[80vh] w-full max-w-md flex-col overflow-hidden rounded-xl border border-border bg-card shadow-xl">

                {/* Header */}

                <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">

                    <div>
                        <h2 className="text-sm font-semibold text-foreground">
                            Start New Chat
                        </h2>

                        <p className="text-xs text-muted-foreground">
                            Select a CRM user to start chatting
                        </p>
                    </div>


                    <button
                        type="button"
                        onClick={handleClose}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
                        aria-label="Close"
                    >
                        <X size={17} />
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
                            value={searchTerm}
                            onChange={(event) =>
                                setSearchTerm(
                                    event.target.value
                                )
                            }
                            placeholder="Search users..."
                            className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
                        />


                        {searchTerm && (
                            <button
                                type="button"
                                onClick={() =>
                                    setSearchTerm("")
                                }
                                className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-muted-foreground transition hover:bg-muted hover:text-foreground"
                                aria-label="Clear search"
                            >
                                <X size={13} />
                            </button>
                        )}

                    </div>

                </div>


                {/* Users */}

                <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto p-2">

                    {isUsersLoading ? (

                        <div className="flex items-center justify-center py-10">
                            <span className="text-xs text-muted-foreground">
                                Loading users...
                            </span>
                        </div>

                    ) : filteredUsers.length === 0 ? (

                        <div className="flex flex-col items-center justify-center py-10 px-4">

                            <Search
                                size={24}
                                className="mb-2 text-muted-foreground"
                            />

                            <span className="text-xs text-muted-foreground">
                                {searchTerm
                                    ? "No users match your search"
                                    : "No users found"}
                            </span>

                        </div>

                    ) : (

                        filteredUsers.map((user) => (

                            <button
                                key={
                                    user.user_id ??
                                    user.id ??
                                    user.email
                                }
                                type="button"
                                onClick={() =>
                                    startChatWithUser(user)
                                }
                                className="flex w-full items-center gap-3 rounded-lg p-3 text-left transition hover:bg-muted"
                            >

                                {/* Avatar */}

                                <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-search-primary text-sm font-semibold text-white">

                                    {(
                                        user.name ??
                                        user.email ??
                                        "U"
                                    )
                                        .charAt(0)
                                        .toUpperCase()}

                                    <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-card bg-emerald-500" />

                                </div>


                                {/* User information */}

                                <div className="min-w-0 flex-1">

                                    <p className="truncate text-sm font-medium text-foreground">
                                        {user.name ??
                                            "Unknown User"}
                                    </p>

                                    <p className="truncate text-xs text-muted-foreground">
                                        {user.description ||
                                            user.email ||
                                            "No description available"}
                                    </p>

                                </div>

                            </button>

                        ))

                    )}

                </div>

            </div>

        </div>
    );
}