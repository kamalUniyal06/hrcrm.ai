import { useCallback, useRef, useState } from "react";
import { MailCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Visualization from "./Visualization";
import PromptLadger from "./PromptLadger";
import { useSelector } from "react-redux";
import MessageModal from "./MessageModal";
import { useInfiniteChildLedger } from "../queries/ledger.queries";

const LadgerCard = ({ timelineData, handleMessageClick }) => {
    const [activeParent, setActiveParent] = useState(null);

    const toggleParent = (id) => {
        setActiveParent((prev) => (prev === id ? null : id));
    };

    return (
        <div className="relative px-4 pb-1 pt-3 sm:px-5">
            {timelineData.map((parent) => {
                const ParentIcon = MailCheck;
                const isOpen = activeParent === parent.id;

                return (
                    /* gap is kept uniform at 20px because the child connector
                       and dot offsets below are absolute values measured from
                       this row's geometry (40px rail + 20px gap + 8px ml-2). */
                    <div key={parent.id} className="relative flex gap-5 pb-3">
                        {/* LEFT SIDE */}
                        <div className="relative flex w-10 shrink-0 flex-col items-center pt-1">
                            <div className="z-20 flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm ring-4 ring-background">
                                <ParentIcon className="h-4 w-4" />
                            </div>

                            <div className="absolute bottom-[-13px] top-9 border-l border-dashed border-border"></div>
                        </div>

                        {/* RIGHT */}
                        <div className="relative min-w-0 flex-1">
                            <ParentCard parent={parent} toggleParent={toggleParent} />
                            {isOpen && <ChildCard parentId={parent.id} handleMessageClick={handleMessageClick} />}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

function ParentCard({ parent, toggleParent }) {
    return (
        <div
            onClick={() => toggleParent(parent.id)}
            className="group min-h-[56px] cursor-pointer rounded-lg border border-border bg-primary/5 px-4 py-3 transition hover:border-primary hover:bg-primary/10 hover:shadow-sm"
        >
            <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
                <div className="min-w-0 grow basis-[min(100%,9rem)]">
                    <h2
                        title={parent.description}
                        className="text-sm font-medium text-foreground break-words line-clamp-2"
                    >
                        {parent.description}
                    </h2>
                </div>

                <div className="ml-auto shrink-0 text-right">
                    <p className="whitespace-nowrap text-[11px] text-muted-foreground">
                        {parent.date_entered}
                    </p>
                </div>
            </div>
        </div>
    );
}


function ChildCard({ parentId, handleMessageClick }) {
    const [hoveredChild, setHoveredChild] = useState(null);
    const { data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isPending, } = useInfiniteChildLedger(parentId)
    const ladgerChild = data?.pages?.flatMap((page) => page.data || []) ?? [];
    const childLoading = isPending || isFetchingNextPage;
    const navigateTo = useNavigate();

    const [, setActiveVisualizationId] = useState(null);
    const [, setActivePromptId] = useState(null);
    const [openChildId, setOpenChildId] = useState(null);
    const observer = useRef();
    const lastChildRef = useCallback(
        (node) => {
            if (isFetchingNextPage) return;

            if (observer.current) {
                observer.current.disconnect();
            }

            observer.current = new IntersectionObserver(
                (entries) => {
                    if (
                        entries[0].isIntersecting &&
                        hasNextPage &&
                        !isFetchingNextPage
                    ) {
                        fetchNextPage();
                    }
                },
                {
                    rootMargin: "300px",
                }
            );

            if (node) {
                observer.current.observe(node);
            }
        },
        [fetchNextPage, hasNextPage, isFetchingNextPage]
    );
    return (
        <div className="mt-5 ml-2 space-y-4 relative">
            {childLoading &&
                [...Array(2)].map((_, index) => (
                    <div
                        key={index}
                        className="relative animate-pulse"
                    >
                        {/* CONNECTOR */}
                        <div className="absolute -left-[42px] top-6 w-[42px] border-t-2 border-dashed border-border"></div>

                        {/* DOT */}
                        <div className="absolute -left-[54px] top-[18px] w-3 h-3 rounded-full bg-muted z-20"></div>

                        {/* CARD */}
                        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                            <div className="flex items-center gap-3 px-4 py-4 sm:px-5">
                                <div className="w-9 h-9 shrink-0 rounded-lg bg-muted"></div>

                                <div className="min-w-0 flex-1 space-y-2">
                                    <div className="h-3 w-full max-w-[8rem] bg-muted rounded"></div>
                                    <div className="h-2 w-full max-w-[5rem] bg-muted rounded"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                ))
            }
            {ladgerChild?.map((child, index) => {
                const tabs = [];

                if (child?.message_id_c) {
                    tabs.push({
                        key: "message",
                        label: "Message",
                    });
                }

                if (child?.prompt_ledger_id) {
                    tabs.push({
                        key: "prompt",
                        label: "Prompt",
                    });
                }

                if (child?.stage_ledger_id) {
                    tabs.push({
                        key: "visualization",
                        label: "Visualization",
                    });
                }

                if (child?.template_id) {
                    tabs.push({
                        key: "template",
                        label: "Template",
                    });
                }

                const defaultTab = tabs?.[0]?.key;
                const isLast = index === ladgerChild.length - 1;
                return (
                    <div
                        key={child.id}
                        ref={isLast ? lastChildRef : null}
                    >
                        <ChildItem
                            child={child}
                            Icon={child.icon}
                            isHovered={hoveredChild === child.id}
                            hoveredChild={hoveredChild}
                            setHoveredChild={setHoveredChild}
                            tabs={tabs}
                            defaultTab={defaultTab}
                            navigateTo={navigateTo}
                            handleMessageClick={handleMessageClick}
                            setActivePromptId={setActivePromptId}
                            setActiveVisualizationId={setActiveVisualizationId}
                            openChildId={openChildId}
                            setOpenChildId={setOpenChildId}
                        />
                    </div>
                );
            })}
        </div>
    );
}
function ChildItem({
    child,
    Icon,
    isHovered,
    setHoveredChild,
    tabs,
    defaultTab,
    navigateTo,
    setActivePromptId,
    setActiveVisualizationId,
    openChildId,
    setOpenChildId,
}) {
    const [activeTab, setActiveTab] =
        useState(defaultTab);
    const { count, contactInfo } = useSelector(state => state.viewEmail)
    const isOpen =
        openChildId === child.id;

    return (
        <div
            className="relative group"
            onMouseEnter={() =>
                setHoveredChild(
                    child.id,
                )
            }
            onMouseLeave={() =>
                setHoveredChild(
                    null,
                )
            }
        >
            {/* CONNECTOR — spans from the dot's right edge to the card edge */}
            <div className="absolute -left-[42px] top-6 w-[42px] border-t-2 border-dashed border-border"></div>

            {/* DOT — centred on the parent rail's dashed vertical line */}
            <div
                className={`
                    absolute -left-[54px] top-[18px]
                    w-3 h-3 rounded-full border-2 border-primary
                    ${isHovered
                        ? "bg-primary/20"
                        : "bg-card"
                    }
                    z-20
                `}
            ></div>

            {/* CARD */}
            <div
                onClick={() =>
                    setOpenChildId(
                        (prev) =>
                            prev ===
                                child.id
                                ? null
                                : child.id,
                    )
                }
                className={`
                    bg-card border rounded-xl overflow-hidden
                    transition-all duration-300 cursor-pointer
                    ${isHovered
                        ? "border-primary/30 shadow-lg scale-[1.01]"
                        : "border-border shadow-sm"
                    }
                `}
            >
                {/* HEADER
                    Wraps instead of squeezing: the title block keeps a 11rem
                    basis so it never collapses to one-word-per-line, and the
                    meta block drops to its own line once both no longer fit.
                    This keys off the card width, so it works in the narrow
                    timeline column as well as on small screens. */}
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 py-3.5 sm:px-5">
                    {/* LEFT */}
                    <div className="flex min-w-0 grow basis-[min(100%,11rem)] items-center gap-3">
                        <div className="w-9 h-9 shrink-0 rounded-lg flex items-center justify-center bg-primary/10">
                            {Icon && (
                                <img
                                    src={Icon}
                                    alt=""
                                    className="h-5 w-5 object-contain"
                                />
                            )}
                        </div>

                        <div className="min-w-0">
                            <h3
                                title={child?.type_c}
                                className="text-sm font-medium text-card-foreground break-words line-clamp-2 sm:text-[15px]"
                            >
                                {
                                    child?.type_c
                                }
                            </h3>
                        </div>
                    </div>

                    {/* RIGHT */}
                    <div className="ml-auto flex shrink-0 items-center gap-x-2 gap-y-0.5 max-sm:w-full max-sm:justify-between max-sm:pl-12 sm:flex-col sm:items-end sm:text-right">
                        <p className="whitespace-nowrap text-[11px] text-muted-foreground sm:text-xs">
                            {
                                child?.date_entered
                            }
                        </p>

                        <p className="min-w-0 max-w-[11rem] truncate text-xs text-muted-foreground sm:text-sm">
                            <i>
                                - by
                            </i>{" "}
                            {!Array.isArray(
                                child?.user_details,
                            )
                                ? child
                                    .user_details
                                    ?.name
                                : "GPC"}
                        </p>
                    </div>
                </div>
            </div>

            {/* POPUP */}
            {isOpen && (
                <div
                    onClick={() =>
                        setOpenChildId(
                            null,
                        )
                    }
                    className="
                        fixed inset-0 z-[9999]
                        flex items-center justify-center
                        bg-foreground/40 backdrop-blur-sm
                        p-4
                    "
                >
                    {/* MODAL */}
                    <div
                        onClick={(
                            e,
                        ) =>
                            e.stopPropagation()
                        }
                        className="
                            bg-card
                            w-full
                            max-w-7xl
                            h-[90vh]
                            rounded-2xl
                            overflow-hidden
                            shadow-2xl
                            flex flex-col
                        "
                    >
                        {/* HEADER */}
                        <div className="flex items-center justify-between border-b px-6 py-4">
                            {/* TABS */}
                            <div className="flex gap-2 flex-wrap">
                                {tabs.map(
                                    (
                                        tab,
                                    ) => (
                                        <button
                                            key={
                                                tab.key
                                            }
                                            onClick={() =>
                                                setActiveTab(
                                                    tab.key,
                                                )
                                            }
                                            className={`
                                                px-4 py-2 rounded-lg text-sm font-medium transition
                                                ${activeTab ===
                                                    tab.key
                                                    ? "bg-primary text-primary-foreground"
                                                    : "bg-muted text-muted-foreground hover:bg-muted"
                                                }
                                            `}
                                        >
                                            {
                                                tab.label
                                            }
                                        </button>
                                    ),
                                )}
                            </div>

                            {/* CLOSE */}
                            <button
                                onClick={() =>
                                    setOpenChildId(
                                        null,
                                    )
                                }
                                className="
                                    w-10 h-10
                                    rounded-lg
                                    hover:bg-muted
                                    text-xl
                                "
                            >
                                ✕
                            </button>
                        </div>

                        {/* CONTENT */}
                        <div className="flex-1 overflow-hidden p-4">
                            {/* MESSAGE */}
                            {activeTab ===
                                "message" && (
                                    <MessageModal
                                        isModal={
                                            false
                                        }
                                        email={contactInfo?.email1}
                                        threadId={child.thread_id_c}
                                        count={count}
                                        messageId={
                                            child.message_id_c
                                        }
                                    />
                                )}

                            {/* PROMPT */}
                            {activeTab ===
                                "prompt" && (
                                    <PromptLadger
                                        isModal={
                                            false
                                        }
                                        activePromptId={
                                            child.prompt_ledger_id
                                        }
                                        setActivePromptId={
                                            setActivePromptId
                                        }
                                    />
                                )}

                            {/* VISUALIZATION */}
                            {activeTab ===
                                "visualization" && (
                                    <Visualization
                                        isModal={
                                            false
                                        }
                                        activeVisualizationId={
                                            child.stage_ledger_id
                                        }
                                        setActiveVisualizationId={
                                            setActiveVisualizationId
                                        }
                                    />
                                )}

                            {/* TEMPLATE */}
                            {activeTab ===
                                "template" && (
                                    <div className="h-full flex items-center justify-center">
                                        <button
                                            onClick={() =>
                                                navigateTo(
                                                    "/settings/templates",
                                                    {
                                                        state:
                                                        {
                                                            templateId:
                                                                child.template_id,
                                                        },
                                                    },
                                                )
                                            }
                                            className="
                                            px-6 py-3
                                            bg-primary
                                            text-primary-foreground
                                            rounded-xl
                                            hover:bg-primary/90
                                        "
                                        >
                                            Open
                                            Template
                                        </button>
                                    </div>
                                )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
export default LadgerCard;