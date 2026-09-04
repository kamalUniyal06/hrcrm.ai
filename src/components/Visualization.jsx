import React, {
    useEffect,
    useRef,
    useState,
} from "react";

import { fetchGpc } from "../services/api";

const Visualization = ({
    activeVisualizationId,
    setActiveVisualizationId,
    isModal = true,
}) => {
    const [
        activeVisualization,
        setActiveVisualization,
    ] = useState(null);

    const [visualLoading, setVisualLoading] =
        useState(false);

    const modalRef = useRef(null);

    useEffect(() => {
        if (!activeVisualizationId) return;

        const getVisualData = async () => {
            try {
                setVisualLoading(true);

                const visualData = await fetchGpc({
                    params: {
                        type: "visualization",
                    },
                    method: "POST",
                    body: {
                        id: activeVisualizationId,
                    },
                });

                console.log(
                    "VISUAL DATA",
                    visualData,
                );

                if (visualData?.success) {
                    setActiveVisualization(
                        visualData?.visualization ||
                        [],
                    );
                }
            } catch (error) {
                console.log(error);
            } finally {
                setVisualLoading(false);
            }
        };

        getVisualData();
    }, [activeVisualizationId]);

    // OUTSIDE CLICK
    useEffect(() => {
        if (!isModal) return;

        const handleOutsideClick = (
            e,
        ) => {
            if (
                modalRef.current &&
                !modalRef.current.contains(
                    e.target,
                )
            ) {
                handleClose();
            }
        };

        document.addEventListener(
            "mousedown",
            handleOutsideClick,
        );

        return () =>
            document.removeEventListener(
                "mousedown",
                handleOutsideClick,
            );
    }, [isModal]);

    const handleClose = () => {
        setActiveVisualization(null);

        if (
            setActiveVisualizationId
        ) {
            setActiveVisualizationId(
                null,
            );
        }
    };

    if (
        !activeVisualization &&
        !visualLoading
    ) {
        return null;
    }

    const content = (
        <div
            ref={modalRef}
            className={`
                bg-white
                border border-gray-200
                rounded-2xl
                relative
                overflow-y-auto
                ${isModal
                    ? "w-[1200px] max-w-[1200px] max-h-[85vh] shadow-2xl"
                    : "w-full h-full shadow-md"
                }
            `}
        >
            {/* CLOSE */}
            {isModal && (
                <button
                    onClick={
                        handleClose
                    }
                    className="
                        absolute top-4 right-4
                        text-gray-500
                        hover:text-black
                        text-lg
                        z-20
                    "
                >
                    ✕
                </button>
            )}

            {/* TITLE */}
            <div className="sticky top-0 bg-white z-10 border-b px-6 py-4">
                <h2 className="text-2xl font-bold text-center">
                    Process
                    Visualization
                </h2>
            </div>

            {/* STEPS */}
            <div className="flex flex-col gap-2 p-6">
                {visualLoading ? (
                    <>
                        {[1, 2, 3, 4].map(
                            (item) => (
                                <div
                                    key={item}
                                    className="animate-pulse"
                                >
                                    <div className="rounded-xl overflow-hidden bg-gray-200 h-[140px] w-full" />

                                    {item !==
                                        4 && (
                                            <div className="flex justify-center my-2">
                                                <div className="w-8 h-8 bg-gray-200 rotate-45 rounded-sm" />
                                            </div>
                                        )}
                                </div>
                            ),
                        )}
                    </>
                ) : (
                    [
                        ...(activeVisualization ||
                            []),
                    ]
                        ?.sort(
                            (a, b) =>
                                Number(
                                    a.process_no,
                                ) -
                                Number(
                                    b.process_no,
                                ),
                        )
                        .map(
                            (
                                step,
                                index,
                            ) => {
                                const colors =
                                    [
                                        {
                                            card: "bg-[#1a73c8]",
                                            num: "bg-[#155eaa]",
                                        },
                                        {
                                            card: "bg-[#e07020]",
                                            num: "bg-[#c25e10]",
                                        },
                                        {
                                            card: "bg-[#3a9e3a]",
                                            num: "bg-[#2e852e]",
                                        },
                                    ];

                                const arrowColors =
                                    [
                                        "#e07020",
                                        "#3a9e3a",
                                        "#888888",
                                    ];

                                const color =
                                    colors[
                                    index %
                                    colors.length
                                    ];

                                return (
                                    <div
                                        key={
                                            step.id
                                        }
                                    >
                                        {/* STEP CARD */}
                                        <div
                                            className={`flex items-stretch rounded-xl overflow-hidden ${color.card}`}
                                        >
                                            {/* NUMBER */}
                                            <div
                                                className={`w-[72px] min-w-[72px] flex items-center justify-center ${color.num}`}
                                            >
                                                <span className="w-[50px] h-[50px] rounded-full border-2 border-white/60 flex items-center justify-center text-white text-2xl font-medium">
                                                    {
                                                        step.process_no
                                                    }
                                                </span>
                                            </div>

                                            {/* CONTENT */}
                                            <div className="flex-1 px-5 py-3">
                                                <p className="text-white text-xl font-medium mb-1">
                                                    <strong>
                                                        {
                                                            step?.name?.split(
                                                                ":",
                                                            )[0]
                                                        }
                                                    </strong>

                                                    {step?.name?.includes(
                                                        ":",
                                                    ) && (
                                                            <span className="font-normal">
                                                                {" "}
                                                                :{" "}
                                                                {step?.name
                                                                    .split(
                                                                        ":",
                                                                    )
                                                                    .slice(
                                                                        1,
                                                                    )
                                                                    .join(
                                                                        ":",
                                                                    )
                                                                    .trim()}
                                                            </span>
                                                        )}
                                                </p>

                                                {(() => {
                                                    let text =
                                                        "No description available";

                                                    try {
                                                        const desc =
                                                            step.description;

                                                        if (
                                                            !desc
                                                        ) {
                                                            text =
                                                                "No description available";
                                                        } else if (
                                                            typeof desc ===
                                                            "string"
                                                        ) {
                                                            text =
                                                                desc
                                                                    .replace(
                                                                        /<[^>]*>/g,
                                                                        "",
                                                                    )
                                                                    .trim();
                                                        } else if (
                                                            typeof desc ===
                                                            "object"
                                                        ) {
                                                            text =
                                                                JSON.stringify(
                                                                    desc,
                                                                    null,
                                                                    2,
                                                                );
                                                        } else {
                                                            text =
                                                                String(
                                                                    desc,
                                                                );
                                                        }
                                                    } catch {
                                                        text =
                                                            "Invalid description format";
                                                    }

                                                    return (
                                                        <pre
                                                            title={
                                                                text
                                                            }
                                                            className="
                                                                text-white/90
                                                                text-sm
                                                                leading-relaxed
                                                                whitespace-pre-wrap
                                                                break-words
                                                                max-h-[300px]
                                                                overflow-auto
                                                            "
                                                        >
                                                            {
                                                                text
                                                            }
                                                        </pre>
                                                    );
                                                })()}
                                            </div>
                                        </div>

                                        {/* ARROW */}
                                        {index <
                                            activeVisualization.length -
                                            1 && (
                                                <div className="flex justify-center my-1">
                                                    <svg
                                                        width="32"
                                                        height="28"
                                                        viewBox="0 0 32 28"
                                                    >
                                                        <polygon
                                                            points="4,0 28,0 16,28"
                                                            fill={
                                                                arrowColors[
                                                                index %
                                                                arrowColors.length
                                                                ]
                                                            }
                                                            opacity="0.85"
                                                        />
                                                    </svg>
                                                </div>
                                            )}
                                    </div>
                                );
                            },
                        )
                )}
            </div>
        </div>
    )

    if (!isModal) {
        return content;
    }

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
            {content}
        </div>
    );
};

export default Visualization;