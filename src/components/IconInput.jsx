import {
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";

import * as Fa from "react-icons/fa";
import * as Fa6 from "react-icons/fa6";
import * as Md from "react-icons/md";
import * as Io from "react-icons/io";
import * as Io5 from "react-icons/io5";
import * as Ai from "react-icons/ai";
import * as Bs from "react-icons/bs";
import * as Bi from "react-icons/bi";
import * as Cg from "react-icons/cg";
import * as Ci from "react-icons/ci";
import * as Di from "react-icons/di";
import * as Fi from "react-icons/fi";
import * as Fc from "react-icons/fc";
import * as Gi from "react-icons/gi";
import * as Go from "react-icons/go";
import * as Gr from "react-icons/gr";
import * as Hi from "react-icons/hi";
import * as Hi2 from "react-icons/hi2";
import * as Im from "react-icons/im";
import * as Lia from "react-icons/lia";
import * as Lu from "react-icons/lu";
import * as Pi from "react-icons/pi";
import * as Ri from "react-icons/ri";
import * as Rx from "react-icons/rx";
import * as Si from "react-icons/si";
import * as Sl from "react-icons/sl";
import * as Tb from "react-icons/tb";
import * as Tfi from "react-icons/tfi";
import * as Ti from "react-icons/ti";
import * as Vsc from "react-icons/vsc";
import * as Wi from "react-icons/wi";

import {
    ChevronDown,
    Search,
    X,
} from "lucide-react";

/* =========================================================
   ICON LIBRARIES
========================================================= */

const LIBRARIES = {
    all: {
        label: "All",
        icons: null,
    },

    fa: {
        label: "Font Awesome",
        icons: Fa,
    },

    fa6: {
        label: "Font Awesome 6",
        icons: Fa6,
    },

    md: {
        label: "Material",
        icons: Md,
    },

    io: {
        label: "Ionicons",
        icons: Io,
    },

    io5: {
        label: "Ionicons 5",
        icons: Io5,
    },

    ai: {
        label: "Ant Design",
        icons: Ai,
    },

    bs: {
        label: "Bootstrap",
        icons: Bs,
    },

    bi: {
        label: "BoxIcons",
        icons: Bi,
    },

    cg: {
        label: "Circum Icons",
        icons: Cg,
    },

    ci: {
        label: "Circum",
        icons: Ci,
    },

    di: {
        label: "Devicons",
        icons: Di,
    },

    fi: {
        label: "Feather",
        icons: Fi,
    },

    fc: {
        label: "Flat Color Icons",
        icons: Fc,
    },

    gi: {
        label: "Game Icons",
        icons: Gi,
    },

    go: {
        label: "Github",
        icons: Go,
    },

    gr: {
        label: "Grommet",
        icons: Gr,
    },

    hi: {
        label: "Heroicons",
        icons: Hi,
    },

    hi2: {
        label: "Heroicons 2",
        icons: Hi2,
    },

    im: {
        label: "IcoMoon",
        icons: Im,
    },

    lia: {
        label: "Icons8 Line Awesome",
        icons: Lia,
    },

    lu: {
        label: "Lucide",
        icons: Lu,
    },

    pi: {
        label: "Phosphor",
        icons: Pi,
    },

    ri: {
        label: "Remix",
        icons: Ri,
    },

    rx: {
        label: "Radix Icons",
        icons: Rx,
    },

    si: {
        label: "Simple Icons",
        icons: Si,
    },

    sl: {
        label: "Simple Line Icons",
        icons: Sl,
    },

    tb: {
        label: "Tabler",
        icons: Tb,
    },

    tfi: {
        label: "Themify",
        icons: Tfi,
    },

    ti: {
        label: "Typicons",
        icons: Ti,
    },

    vsc: {
        label: "VS Code",
        icons: Vsc,
    },

    wi: {
        label: "Weather",
        icons: Wi,
    },
};

/* =========================================================
   CREATE ICON LIST
========================================================= */

const createIconList = () => {
    const result = [];

    Object.entries(LIBRARIES).forEach(
        ([library, config]) => {
            if (!config.icons) return;

            Object.entries(config.icons).forEach(
                ([name, Icon]) => {
                    if (
                        typeof Icon !==
                        "function"
                    ) {
                        return;
                    }

                    result.push({
                        name,
                        library,
                        Icon,
                    });
                }
            );
        }
    );

    return result;
};

/*
 * Created once at module level.
 * This prevents rebuilding the huge icon list
 * every time the component renders.
 */
const ALL_ICONS = createIconList();

/* =========================================================
   COMPONENT
========================================================= */

export default function IconInput({
    value = null,
    onChange,
    placeholder = "Select icon",
    className = "",
    disabled = false,
}) {
    const [open, setOpen] =
        useState(false);

    const [search, setSearch] =
        useState("");

    const [library, setLibrary] =
        useState("all");

    const containerRef =
        useRef(null);

    /* =====================================================
       CLOSE WHEN CLICKING OUTSIDE
    ===================================================== */

    useEffect(() => {
        const handleClickOutside = (
            event
        ) => {
            if (
                containerRef.current &&
                !containerRef.current.contains(
                    event.target
                )
            ) {
                setOpen(false);
            }
        };

        document.addEventListener(
            "mousedown",
            handleClickOutside
        );

        return () => {
            document.removeEventListener(
                "mousedown",
                handleClickOutside
            );
        };
    }, []);

    /* =====================================================
       FILTER ICONS
    ===================================================== */

    const filteredIcons = useMemo(() => {
        const query =
            search
                .trim()
                .toLowerCase();

        let icons = ALL_ICONS;

        if (library !== "all") {
            icons = icons.filter(
                (icon) =>
                    icon.library ===
                    library
            );
        }

        if (query) {
            icons = icons.filter(
                (icon) =>
                    icon.name
                        .toLowerCase()
                        .includes(query)
            );
        }

        /*
         * Important:
         * Don't render thousands of icons
         * at the same time.
         */
        return icons.slice(0, 300);
    }, [
        search,
        library,
    ]);

    /* =====================================================
       SELECT ICON
    ===================================================== */

    const handleSelect = (icon) => {
        const selected = {
            name: icon.name,
            library: icon.library,
        };

        onChange?.(selected);

        setOpen(false);
        setSearch("");
    };

    /* =====================================================
       REMOVE ICON
    ===================================================== */

    const handleRemove = (event) => {
        event.stopPropagation();

        onChange?.(null);
    };

    /* =====================================================
       SELECTED ICON
    ===================================================== */

    const SelectedIcon =
        value?.library &&
            value?.name
            ? LIBRARIES[
                value.library
            ]?.icons?.[value.name]
            : null;

    return (
        <div
            ref={containerRef}
            className={`relative w-full ${className}`}
        >
            {/* =================================================
                INPUT
            ================================================= */}

            <button
                type="button"
                disabled={disabled}
                onClick={() =>
                    setOpen(
                        (current) =>
                            !current
                    )
                }
                className={`
                    flex
                    h-10
                    w-full
                    items-center
                    justify-between
                    rounded-md
                    border
                    border-gray-300
                    bg-white
                    px-3
                    text-left
                    transition
                    hover:border-gray-400
                    focus:outline-none
                    focus:ring-2
                    focus:ring-blue-500/20
                    disabled:cursor-not-allowed
                    disabled:opacity-50
                `}
            >
                <div className="flex min-w-0 items-center gap-2">
                    {SelectedIcon ? (
                        <SelectedIcon
                            size={20}
                            className="shrink-0 text-gray-700"
                        />
                    ) : (
                        <div className="h-5 w-5 rounded border border-dashed border-gray-300" />
                    )}

                    <span
                        className={`
                            truncate text-sm
                            ${value
                                ? "text-gray-900"
                                : "text-gray-400"
                            }
                        `}
                    >
                        {value?.name ||
                            placeholder}
                    </span>
                </div>

                <ChevronDown
                    size={17}
                    className={`
                        shrink-0
                        text-gray-400
                        transition-transform
                        ${open
                            ? "rotate-180"
                            : ""
                        }
                    `}
                />
            </button>

            {/* =================================================
                POPOVER
            ================================================= */}

            {open && (
                <div
                    className="
                        absolute
                        left-0
                        top-[calc(100%+6px)]
                        z-50
                        w-[420px]
                        max-w-[calc(100vw-24px)]
                        overflow-hidden
                        rounded-lg
                        border
                        border-gray-700
                        bg-[#242424]
                        text-gray-200
                        shadow-2xl
                    "
                >
                    {/* =============================================
                        TOP TABS
                    ============================================= */}

                    <div className="flex h-11 items-center border-b border-gray-700 px-2">
                        <div className="flex h-full items-center gap-1">
                            <button
                                type="button"
                                className="
                                    h-full
                                    border-b-2
                                    border-white
                                    px-3
                                    text-sm
                                    font-medium
                                    text-white
                                "
                            >
                                Icons
                            </button>

                            <button
                                type="button"
                                className="
                                    h-full
                                    px-3
                                    text-sm
                                    text-gray-400
                                    hover:text-white
                                "
                            >
                                Emoji
                            </button>

                            <button
                                type="button"
                                className="
                                    h-full
                                    px-3
                                    text-sm
                                    text-gray-400
                                    hover:text-white
                                "
                            >
                                Upload
                            </button>
                        </div>

                        {value && (
                            <button
                                type="button"
                                onClick={
                                    handleRemove
                                }
                                className="
                                    ml-auto
                                    px-3
                                    text-sm
                                    text-gray-400
                                    hover:text-white
                                "
                            >
                                Remove
                            </button>
                        )}
                    </div>

                    {/* =============================================
                        SEARCH
                    ============================================= */}

                    <div className="flex gap-2 border-b border-gray-700 p-3">
                        <div className="relative flex-1">
                            <Search
                                size={16}
                                className="
                                    absolute
                                    left-3
                                    top-1/2
                                    -translate-y-1/2
                                    text-gray-500
                                "
                            />

                            <input
                                autoFocus
                                value={search}
                                onChange={(
                                    e
                                ) =>
                                    setSearch(
                                        e
                                            .target
                                            .value
                                    )
                                }
                                placeholder="Filter..."
                                className="
                                    h-9
                                    w-full
                                    rounded-md
                                    border
                                    border-gray-600
                                    bg-[#1f1f1f]
                                    pl-9
                                    pr-8
                                    text-sm
                                    text-white
                                    outline-none
                                    placeholder:text-gray-500
                                    focus:border-blue-500
                                "
                            />

                            {search && (
                                <button
                                    type="button"
                                    onClick={() =>
                                        setSearch(
                                            ""
                                        )
                                    }
                                    className="
                                        absolute
                                        right-2
                                        top-1/2
                                        -translate-y-1/2
                                        text-gray-500
                                        hover:text-white
                                    "
                                >
                                    <X
                                        size={
                                            15
                                        }
                                    />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* =============================================
                        LIBRARY SELECTOR
                    ============================================= */}

                    <div className="border-b border-gray-700 px-3 py-2">
                        <select
                            value={
                                library
                            }
                            onChange={(
                                e
                            ) =>
                                setLibrary(
                                    e
                                        .target
                                        .value
                                )
                            }
                            className="
                                h-8
                                w-full
                                rounded-md
                                border
                                border-gray-600
                                bg-[#1f1f1f]
                                px-2
                                text-xs
                                text-gray-300
                                outline-none
                                focus:border-blue-500
                            "
                        >
                            {Object.entries(
                                LIBRARIES
                            ).map(
                                ([
                                    key,
                                    config,
                                ]) => (
                                    <option
                                        key={
                                            key
                                        }
                                        value={
                                            key
                                        }
                                    >
                                        {
                                            config.label
                                        }
                                    </option>
                                )
                            )}
                        </select>
                    </div>

                    {/* =============================================
                        ICON HEADER
                    ============================================= */}

                    <div className="flex items-center justify-between px-3 pb-1 pt-3">
                        <span className="text-xs font-medium text-gray-400">
                            Icons
                        </span>

                        <span className="text-[11px] text-gray-500">
                            {filteredIcons.length}
                            +
                        </span>
                    </div>

                    {/* =============================================
                        ICON GRID
                    ============================================= */}

                    <div
                        className="
                            h-[290px]
                            overflow-y-auto
                            px-3
                            pb-3
                            pt-1

                            [&::-webkit-scrollbar]:w-2
                            [&::-webkit-scrollbar-track]:bg-transparent
                            [&::-webkit-scrollbar-thumb]:rounded-full
                            [&::-webkit-scrollbar-thumb]:bg-gray-600
                        "
                    >
                        {filteredIcons.length >
                            0 ? (
                            <div className="grid grid-cols-8 gap-1">
                                {filteredIcons.map(
                                    (
                                        icon
                                    ) => {
                                        const Icon =
                                            icon.Icon;

                                        const selected =
                                            value
                                                ?.name ===
                                            icon.name &&
                                            value
                                                ?.library ===
                                            icon.library;

                                        return (
                                            <button
                                                key={`${icon.library}-${icon.name}`}
                                                type="button"
                                                title={`${icon.name} • ${icon.library}`}
                                                onClick={() =>
                                                    handleSelect(
                                                        icon
                                                    )
                                                }
                                                className={`
                                                    flex
                                                    h-10
                                                    w-full
                                                    items-center
                                                    justify-center
                                                    rounded-md
                                                    transition
                                                    ${selected
                                                        ? "bg-blue-600 text-white"
                                                        : "text-gray-300 hover:bg-gray-700 hover:text-white"
                                                    }
                                                `}
                                            >
                                                <Icon
                                                    size={
                                                        21
                                                    }
                                                />
                                            </button>
                                        );
                                    }
                                )}
                            </div>
                        ) : (
                            <div className="flex h-56 items-center justify-center">
                                <div className="text-center">
                                    <Search
                                        size={
                                            24
                                        }
                                        className="mx-auto mb-2 text-gray-600"
                                    />

                                    <p className="text-sm text-gray-400">
                                        No icons
                                        found
                                    </p>

                                    <p className="mt-1 text-xs text-gray-600">
                                        Try a
                                        different
                                        search
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* =============================================
                        FOOTER
                    ============================================= */}

                    <div className="flex items-center justify-between border-t border-gray-700 bg-[#202020] px-3 py-2">
                        <span className="truncate text-xs text-gray-500">
                            {value
                                ? `${value.library}:${value.name}`
                                : "No icon selected"}
                        </span>

                        {value && (
                            <button
                                type="button"
                                onClick={
                                    handleRemove
                                }
                                className="
                                    ml-2
                                    shrink-0
                                    text-xs
                                    text-gray-400
                                    hover:text-red-400
                                "
                            >
                                Clear
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
