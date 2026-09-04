import React, { useState, useRef, useEffect } from "react";
import EmojiPicker from "emoji-picker-react";
import { Plus, SendHorizonal } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { sendEmail } from "../store/Slices/viewEmail";
import { gsap } from "gsap";
import { toast } from "react-toastify";
import { fetchGpc } from "../services/api";

const EmojiInput = () => {
    const [selectedEmoji, setSelectedEmoji] = useState("");
    const { sending, contactInfo } = useSelector(state => state.viewEmail);
    const { user, crmEndpoint } = useSelector(state => state.user);
    const [showPicker, setShowPicker] = useState(false);
    const [checkingThreadId, setCheckingTheadId] = useState(false);

    const pickerRef = useRef(null);
    const emojiRef = useRef(null);

    const dispatch = useDispatch();

    // Handle emoji select
    const handleEmojiClick = (emojiData) => {
        setSelectedEmoji(emojiData.emoji);
        setShowPicker(false);
    };

    // Quick emojis
    const quickEmojis = ["👍", "🙏"];

    // Send handler
    const handleSend = async () => {
        if (!selectedEmoji) return;

        try {
            setCheckingTheadId(true);

            const data = await fetchGpc({
                params: { type: "re_check_thread", thread_id: contactInfo?.thread_id },
            });
            console.log("MATHED THREAD ID", data);

            if (!(data?.success || data.data)) {
                toast.error("Failed to verify thread!");
                return;
            }
            if (!data?.data?.find(email => email.toLowerCase() == currentEmail.toLowerCase())) {
                toast.error('Wrong Thread Id Detected! Try Again.')
                return;
            }

            const formData = new FormData();
            formData.append("threadId", contactInfo.thread_id);
            formData.append("replyBody", selectedEmoji);
            formData.append("email", contactInfo?.email1);
            formData.append("current_email", user.email);
            formData.append("force_send", 1);

            dispatch(sendEmail(formData));

        } catch (error) {
            console.error(error);
            toast.error("Something went wrong while checking thread!");
        } finally {
            setCheckingTheadId(false);
        }

        // setSelectedEmoji("");
    };

    // Close picker on outside click
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (pickerRef.current && !pickerRef.current.contains(e.target)) {
                setShowPicker(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const animationRef = useRef(null);

    useEffect(() => {
        if ((sending || checkingThreadId) && emojiRef.current) {

            // kill previous animation if exists
            if (animationRef.current) {
                animationRef.current.kill();
            }

            // create looping animation
            const tl = gsap.timeline({ repeat: -1 });

            tl.fromTo(
                emojiRef.current,
                { y: 0, opacity: 1, scale: 1 },
                {
                    y: -250,
                    opacity: 0,
                    scale: 4,
                    duration: 2,
                    ease: "power3.out",
                }
            ).set(emojiRef.current, {
                y: 0,
                opacity: 1,
                scale: 1,
            });

            // optional shake inside loop
            tl.to(
                emojiRef.current,
                {
                    x: "+=15",
                    repeat: 1,
                    yoyo: true,
                    duration: 0.2,
                },
                0 // start at same time
            );

            animationRef.current = tl;

        } else {
            // stop animation when sending ends
            if (animationRef.current) {
                animationRef.current.kill();
                animationRef.current = null;
            }
        }

        return () => {
            if (animationRef.current) {
                animationRef.current.kill();
            }
        };

    }, [sending, checkingThreadId]);

    return (
        <div className="relative w-fit">

            {/* 🎉 Animated Emoji */}
            {(sending || checkingThreadId) && selectedEmoji && (
                <div
                    ref={emojiRef}
                    className="absolute bottom-14 right-6 text-3xl pointer-events-none"
                >
                    {selectedEmoji}
                </div>
            )}

            {/* Main UI */}
            <div className="flex items-center gap-8 bg-white p-2 rounded-xl shadow">

                {/* Quick Emojis */}
                <div className="relative flex items-center">
                    {quickEmojis.map((emoji, index) => (
                        <button
                            key={index}
                            onClick={() => setSelectedEmoji(emoji)}
                            className={`text-xs mr-2 bg-cyan-300 cursor-pointer rounded-full px-2 py-1 transition ${selectedEmoji === emoji ? "scale-125" : ""
                                }`}
                        >
                            {emoji}
                        </button>
                    ))}

                    {/* Plus Button */}
                    <button
                        onClick={() => setShowPicker(!showPicker)}
                        className="absolute -top-3 -right-4 p-2 bg-gray-50 border rounded-full cursor-pointer hover:bg-gray-200"
                    >
                        <Plus size={10} color="black" />
                    </button>
                </div>

                {/* Send Button */}
                {selectedEmoji && (
                    <button
                        onClick={handleSend}
                        disabled={sending || checkingThreadId}
                        className="flex items-center border gap-1 px-3 py-1 text-teal-900 rounded-lg bg-cyan-100 text-xl cursor-pointer disabled:opacity-50"
                    >
                        <SendHorizonal size={18} />
                        {selectedEmoji}
                    </button>
                )}
            </div>

            {/* Emoji Picker */}
            {showPicker && (
                <div
                    ref={pickerRef}
                    className="absolute bottom-0 right-0 z-50"
                >
                    <EmojiPicker onEmojiClick={handleEmojiClick} />
                </div>
            )}
        </div>
    );
};

export default EmojiInput;