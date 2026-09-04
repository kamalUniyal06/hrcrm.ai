import {
    Send,
    Smile,
} from "lucide-react";

import EmojiPicker from "emoji-picker-react";

import {
    useEffect,
    useRef,
    useState,
} from "react";

import {
    useInternalChat,
} from "../context/InternalChatContext";


export default function ChatInput() {
    const {
        selectedUser,
        message,
        setMessage,
        sendCurrentMessage,
        isSendingMessage,
    } = useInternalChat();


    const [
        showEmojiPicker,
        setShowEmojiPicker,
    ] = useState(false);


    const emojiPickerRef =
        useRef(null);


    /* ==========================================
       CLOSE EMOJI PICKER ON OUTSIDE CLICK
    ========================================== */

    useEffect(() => {
        const handleClickOutside = (
            event
        ) => {
            if (
                emojiPickerRef.current &&
                !emojiPickerRef.current.contains(
                    event.target
                )
            ) {
                setShowEmojiPicker(false);
            }
        };

        if (showEmojiPicker) {
            document.addEventListener(
                "mousedown",
                handleClickOutside
            );
        }

        return () => {
            document.removeEventListener(
                "mousedown",
                handleClickOutside
            );
        };
    }, [
        showEmojiPicker,
    ]);


    /* ==========================================
       NO SELECTED USER
    ========================================== */

    if (!selectedUser) {
        return null;
    }


    /* ==========================================
       EMOJI SELECT
    ========================================== */

    const handleEmojiClick = (
        emojiData
    ) => {
        if (
            isSendingMessage
        ) {
            return;
        }

        setMessage(
            (currentMessage) =>
                `${currentMessage}${emojiData.emoji}`
        );
    };


    /* ==========================================
       SEND MESSAGE
    ========================================== */

    const handleSend = async () => {
        if (
            !message.trim() ||
            isSendingMessage
        ) {
            return;
        }

        setShowEmojiPicker(false);

        await sendCurrentMessage();
    };


    /* ==========================================
       KEYBOARD HANDLER
    ========================================== */

    const handleKeyDown = (
        event
    ) => {
        /*
         * Enter = Send
         *
         * Shift + Enter = New line
         */

        if (
            event.key === "Enter" &&
            !event.shiftKey
        ) {
            event.preventDefault();

            handleSend();
        }
    };


    return (
        <div className="relative shrink-0 border-t border-border bg-card p-3">

            <div className="mx-auto flex w-full max-w-4xl items-end gap-2">

                {/* ==================================
                    MESSAGE INPUT
                ================================== */}

                <div
                    className="
                        relative
                        flex
                        min-h-[42px]
                        flex-1
                        items-end
                        rounded-xl
                        bg-input-background
                        px-3
                        transition
                        focus-within:ring-2
                        focus-within:ring-search-primary/20
                    "
                >

                    <textarea
                        value={message}
                        onChange={(event) =>
                            setMessage(
                                event.target.value
                            )
                        }
                        onKeyDown={
                            handleKeyDown
                        }
                        rows={1}
                        placeholder={`Message ${selectedUser?.name ||
                            "user"
                            }...`}
                        disabled={
                            isSendingMessage
                        }
                        className="
                            max-h-32
                            min-h-[42px]
                            flex-1
                            resize-none
                            bg-transparent
                            py-2.5
                            text-sm
                            text-foreground
                            outline-none
                            placeholder:text-muted-foreground
                            disabled:cursor-not-allowed
                            disabled:opacity-60
                        "
                    />


                    {/* ==================================
                        EMOJI BUTTON
                    ================================== */}

                    <div
                        ref={
                            emojiPickerRef
                        }
                        className="relative mb-1"
                    >

                        <button
                            type="button"
                            disabled={
                                isSendingMessage
                            }
                            onClick={() =>
                                setShowEmojiPicker(
                                    (previous) =>
                                        !previous
                                )
                            }
                            aria-label="Open emoji picker"
                            className="
                                flex
                                h-8
                                w-8
                                shrink-0
                                items-center
                                justify-center
                                rounded-lg
                                text-muted-foreground
                                transition
                                hover:bg-accent
                                hover:text-foreground
                                disabled:cursor-not-allowed
                                disabled:opacity-50
                            "
                        >
                            <Smile
                                size={18}
                            />
                        </button>


                        {/* ==================================
                            EMOJI PICKER
                        ================================== */}

                        {showEmojiPicker && (
                            <div
                                className="
                                    absolute
                                    bottom-11
                                    right-0
                                    z-50
                                    overflow-hidden
                                    rounded-xl
                                    border
                                    border-border
                                    shadow-xl
                                "
                            >
                                <EmojiPicker
                                    onEmojiClick={
                                        handleEmojiClick
                                    }

                                    width={320}

                                    height={400}

                                    searchPlaceholder="Search emoji..."

                                    lazyLoadEmojis

                                    previewConfig={{
                                        showPreview: false,
                                    }}

                                    theme="auto"

                                    emojiStyle="native"
                                />
                            </div>
                        )}

                    </div>

                </div>


                {/* ==================================
                    SEND BUTTON
                ================================== */}

                <button
                    type="button"
                    onClick={
                        handleSend
                    }
                    disabled={
                        !message.trim() ||
                        isSendingMessage
                    }
                    aria-label="Send message"
                    className="
                        mb-1
                        flex
                        h-10
                        w-10
                        shrink-0
                        items-center
                        justify-center
                        rounded-xl
                        bg-search-primary
                        text-white
                        shadow-sm
                        transition
                        hover:opacity-90
                        active:scale-95
                        disabled:cursor-not-allowed
                        disabled:opacity-50
                    "
                >

                    {isSendingMessage ? (
                        <span
                            className="
                                h-4
                                w-4
                                animate-spin
                                rounded-full
                                border-2
                                border-white/40
                                border-t-white
                            "
                        />
                    ) : (
                        <Send
                            size={17}
                        />
                    )}

                </button>

            </div>
        </div>
    );
}