import {
    InternalChatProvider,
    useInternalChat,
} from "./context/InternalChatContext";

import ChatSidebar from "./components/ChatSidebar";
import ChatHeader from "./components/ChatHeader";
import ChatMessages from "./components/ChatMessages";
import ChatInput from "./components/ChatInput";
import StartChatModal from "./components/StartChatModal";

const InternalChatContent = () => {
    const {
        selectedUser,
    } = useInternalChat();

    return (
        <div
            className="
                flex
                h-full
                min-h-0
                w-full
                flex-1
                overflow-hidden
                rounded-xl
                border
                border-border
                mb-10
                bg-card
            "
        >
            {/* =========================================
                CHAT SIDEBAR
            ========================================== */}

            <div
                className={`
                    h-full
                    min-h-0
                    shrink-0
                    overflow-hidden

                    ${selectedUser
                        ? "hidden md:flex"
                        : "flex w-full md:w-[340px]"
                    }
                `}
            >
                <ChatSidebar />
            </div>

            {/* =========================================
                CHAT PANEL
            ========================================== */}

            <div
                className={`
                    min-h-0
                    min-w-0
                    flex-1
                    flex-col
                    overflow-hidden

                    ${selectedUser
                        ? "flex"
                        : "hidden md:flex"
                    }
                `}
            >
                {/* Header - fixed height */}
                <div className="shrink-0">
                    <ChatHeader />
                </div>

                {/* Messages - TAKES ALL REMAINING SPACE */}
                <div
                    className="
                        min-h-0
                        flex-1
                        overflow-hidden
                    "
                >
                    <ChatMessages />
                </div>

                {/* Input - fixed at bottom */}
                <div className="shrink-0">
                    <ChatInput />
                </div>
            </div>

            <StartChatModal />
        </div>
    );
};

export default function InternalChats() {
    return (
        <InternalChatProvider>
            <InternalChatContent />
        </InternalChatProvider>
    );
}