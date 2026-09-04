import React, {
    useEffect,
    useRef,
    useState,
} from "react";

import { fetchGpc } from "../services/api";
import { useNavigate } from "react-router-dom";

const LARGE_FIELDS = [
    "response",
    "full_prompt",
    "system_prompt",
    "user_prompt",
    "static_prompt",
];

const PromptLadger = ({
    activePromptId,
    setActivePromptId,
    isModal = true,
}) => {
    const [activePrompt, setActivePrompt] =
        useState(null);

    const [promptLoading, setPromptLoading] =
        useState(false);

    const modalRef = useRef(null);

    const navigateTo = useNavigate();

    useEffect(() => {
        if (!isModal) return;

        const handleClickOutside = (event) => {
            if (
                modalRef.current &&
                !modalRef.current.contains(
                    event.target,
                )
            ) {
                handleClose();
            }
        };

        document.addEventListener(
            "mousedown",
            handleClickOutside,
        );

        return () => {
            document.removeEventListener(
                "mousedown",
                handleClickOutside,
            );
        };
    }, [isModal]);

    useEffect(() => {
        if (!activePromptId) return;

        const getPromptData = async () => {
            try {
                setPromptLoading(true);

                const response = await fetchGpc({
                    params: {
                        type: "prompt_details",
                    },
                    method: "POST",
                    body: {
                        id: activePromptId,
                    },
                });

                if (response?.success) {
                    setActivePrompt(
                        response?.Prompt?.[0] ||
                        response
                            ?.prompt_details?.[0] ||
                        {},
                    );
                }
            } catch (error) {
                console.log(error);
            } finally {
                setPromptLoading(false);
            }
        };

        getPromptData();
    }, [activePromptId]);

    const handleClose = () => {
        setActivePrompt(null);

        setActivePromptId(null);
    };

    const splitPrompt = (text = "") => {
        const separator =
            "----------------------------------------------------------------------";

        if (!text.includes(separator)) {
            return {
                system: text,
                user: "",
            };
        }

        const parts = text.split(separator);

        return {
            system: parts[0]?.trim() || "",
            user:
                parts
                    .slice(1)
                    .join(separator)
                    ?.trim() || "",
        };
    };

    const getPromptStats = (
        text = "",
    ) => {
        return {
            words:
                String(text)
                    ?.split(/\s+/)
                    ?.filter(Boolean)
                    ?.length || 0,

            lines:
                String(text)?.split("\n")
                    ?.length || 0,
        };
    };

    const formatValue = (
        value,
        key = "",
    ) => {
        try {
            // NULL / UNDEFINED
            if (
                value === null ||
                value === undefined
            ) {
                return "";
            }

            // RESPONSE OBJECT
            if (
                key === "response" &&
                typeof value === "object"
            ) {
                return Object.entries(value)
                    .map(([k, v]) => {
                        // ARRAY
                        if (
                            Array.isArray(v)
                        ) {
                            return `${k}:\n${v.length
                                ? JSON.stringify(
                                    v,
                                    null,
                                    2,
                                )
                                : "[]"
                                }`;
                        }

                        // OBJECT
                        if (
                            typeof v ===
                            "object" &&
                            v !== null
                        ) {
                            return `${k}:\n${JSON.stringify(
                                v,
                                null,
                                2,
                            )}`;
                        }

                        // NORMAL VALUE
                        return `${k}: ${v}`;
                    })
                    .join("\n\n");
            }

            // NORMAL OBJECT
            if (
                typeof value === "object"
            ) {
                return JSON.stringify(
                    value,
                    null,
                    2,
                );
            }

            // STRINGIFIED JSON
            if (
                typeof value === "string"
            ) {
                try {
                    const parsed =
                        JSON.parse(value);

                    if (
                        typeof parsed ===
                        "object"
                    ) {
                        return JSON.stringify(
                            parsed,
                            null,
                            2,
                        );
                    }

                    return value;
                } catch {
                    return value;
                }
            }

            return String(value);
        } catch (error) {
            console.log(error);

            return String(value);
        }
    };

    if (
        !activePrompt &&
        !promptLoading &&
        !activePromptId
    ) {
        return null;
    }

    const content = (
        <div
            ref={modalRef}
            className={`
                rounded-2xl
                border border-gray-200
                bg-white
                overflow-hidden
                ${isModal
                    ? "shadow-2xl w-full max-w-7xl max-h-[92vh]"
                    : "w-full h-full shadow-md"
                }
            `}
        >
            {/* HEADER */}
            <div className="sticky top-0 z-20 bg-white border-b px-6 py-4 flex justify-between items-center">
                <div className="flex items-center gap-3 flex-wrap">
                    <h2 className="text-xl font-semibold text-gray-800">
                        Prompt Ledger
                    </h2>

                    {activePrompt?.prompt_id && (
                        <>
                            {/* EDIT */}
                            <button
                                onClick={() => {
                                    navigateTo(
                                        "/settings/machine-learning",
                                        {
                                            state: {
                                                promptId:
                                                    activePrompt.prompt_id,
                                                promptStatus:
                                                    activePrompt.prompt_stage,
                                            },
                                        },
                                    );
                                }}
                                className="
                                    px-4 py-2
                                    text-sm
                                    bg-blue-600
                                    text-white
                                    rounded-lg
                                    hover:bg-blue-700
                                    transition-all
                                "
                            >
                                Edit
                            </button>

                            {/* EXPLORE */}
                            <button
                                onClick={() => {
                                    const sys =
                                        activePrompt?.system_prompt?.trim();

                                    const usr =
                                        activePrompt?.user_prompt?.trim();

                                    if (
                                        sys ||
                                        usr
                                    ) {
                                        navigateTo(
                                            "/settings/prompt-explorer",
                                            {
                                                state: {
                                                    system:
                                                        sys ||
                                                        "",
                                                    user:
                                                        usr ||
                                                        "",
                                                },
                                            },
                                        );
                                    } else {
                                        const {
                                            system,
                                            user,
                                        } =
                                            splitPrompt(
                                                activePrompt?.full_prompt,
                                            );

                                        navigateTo(
                                            "/settings/prompt-explorer",
                                            {
                                                state: {
                                                    system,
                                                    user,
                                                },
                                            },
                                        );
                                    }
                                }}
                                className="
                                    px-4 py-2
                                    text-sm
                                    bg-purple-600
                                    text-white
                                    rounded-lg
                                    hover:bg-purple-700
                                    transition-all
                                "
                            >
                                Explore
                            </button>
                        </>
                    )}
                </div>

                {/* CLOSE */}
                {isModal && (
                    <button
                        onClick={handleClose}
                        className="
                            w-10 h-10
                            rounded-lg
                            hover:bg-gray-100
                            text-gray-500
                            hover:text-black
                            transition-all
                            text-xl
                        "
                    >
                        ✕
                    </button>
                )}
            </div>

            {/* BODY */}
            <div
                className={`
                    ${isModal
                        ? "max-h-[calc(92vh-80px)] overflow-y-auto"
                        : "h-full overflow-y-auto"
                    }
                `}
            >
                {promptLoading ? (
                    <div className="p-6 space-y-5">
                        {[1, 2, 3, 4].map(
                            (item) => (
                                <div
                                    key={item}
                                    className="
                                        border border-gray-200
                                        rounded-2xl
                                        p-5
                                        bg-gray-50
                                        animate-pulse
                                    "
                                >
                                    <div className="h-4 w-40 bg-gray-200 rounded mb-4" />

                                    <div className="flex gap-4 mb-4">
                                        <div className="h-6 w-20 bg-gray-200 rounded-lg" />

                                        <div className="h-6 w-20 bg-gray-200 rounded-lg" />
                                    </div>

                                    <div className="h-[320px] w-full bg-gray-200 rounded-xl" />
                                </div>
                            ),
                        )}
                    </div>
                ) : (
                    <div className="p-6 space-y-5">
                        {Object.entries(
                            activePrompt || {},
                        )
                            .filter(
                                ([key, value]) =>
                                    LARGE_FIELDS.includes(
                                        key,
                                    ) &&
                                    value !== "" &&
                                    value !==
                                    null &&
                                    value !==
                                    undefined &&
                                    !(
                                        typeof value ===
                                        "object" &&
                                        Object.keys(
                                            value,
                                        ).length ===
                                        0
                                    ),
                            )
                            .sort(([a], [b]) => {
                                if (
                                    a ===
                                    "response"
                                )
                                    return -1;

                                if (
                                    b ===
                                    "response"
                                )
                                    return 1;

                                return 0;
                            })
                            .map(
                                ([key, value]) => (
                                    <div
                                        key={key}
                                        className="
                                            border border-gray-200
                                            rounded-2xl
                                            p-5
                                            bg-gray-50
                                            shadow-sm
                                        "
                                    >
                                        {/* LABEL */}
                                        <div className="text-xs font-semibold tracking-wider text-gray-500 mb-3">
                                            {key
                                                .replace(
                                                    /_/g,
                                                    " ",
                                                )
                                                .toUpperCase()}
                                        </div>

                                        {/* RESPONSE */}
                                        {key ===
                                            "response" ? (
                                            <div className="w-full max-h-[500px] overflow-auto text-sm bg-black text-green-400 p-4 rounded-xl whitespace-pre-wrap break-words font-mono">
                                                {formatValue(
                                                    value,
                                                    key,
                                                )}
                                            </div>
                                        ) : (
                                            <>
                                                {/* STATS */}
                                                {(typeof value ===
                                                    "string" ||
                                                    typeof value ===
                                                    "number" ||
                                                    typeof value ===
                                                    "object") && (
                                                        <div className="flex gap-4 text-xs text-gray-600 bg-gray-200 px-3 py-1 rounded-lg w-fit mb-3">
                                                            <span>
                                                                Words:{" "}
                                                                {
                                                                    getPromptStats(
                                                                        formatValue(
                                                                            value,
                                                                            key,
                                                                        ),
                                                                    )
                                                                        .words
                                                                }
                                                            </span>

                                                            <span>
                                                                Lines:{" "}
                                                                {
                                                                    getPromptStats(
                                                                        formatValue(
                                                                            value,
                                                                            key,
                                                                        ),
                                                                    )
                                                                        .lines
                                                                }
                                                            </span>
                                                        </div>
                                                    )}

                                                {/* TEXTAREA */}
                                                <textarea
                                                    readOnly
                                                    value={formatValue(
                                                        value,
                                                        key,
                                                    )}
                                                    className="
                                                        w-full
                                                        h-[320px]
                                                        text-sm
                                                        font-mono
                                                        bg-black
                                                        text-green-400
                                                        p-4
                                                        rounded-xl
                                                        resize-none
                                                        outline-none
                                                    "
                                                />
                                            </>
                                        )}
                                    </div>
                                ),
                            )}
                    </div>
                )}
            </div>
        </div>
    );

    if (!isModal) {
        return content;
    }

    return (
        <div
            className="
                fixed inset-0
                flex items-center justify-center
                z-[9999]
                backdrop-blur-md
                p-4
            "
        >
            {content}
        </div>
    );
};

export default PromptLadger;