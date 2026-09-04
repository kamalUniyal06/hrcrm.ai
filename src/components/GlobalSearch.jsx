import {
    Search,
    X,
    Copy,
    Check,
} from "lucide-react";

import {
    useContext,
    useEffect,
    useRef,
    useState,
} from "react";

import { motion } from "framer-motion";
import { toast } from "react-toastify";

import { PageContext } from "../context/pageContext";

const STORAGE_KEY = "emailSearchHistory";

const GlobalSearch = () => {
    const {
        enteredEmail,
        setEnteredEmail,
        handleClear,
        handleDateClick,
    } = useContext(PageContext);

    const [search, setSearch] = useState("");

    const [copied, setCopied] =
        useState(false);

    const [searchHistory, setSearchHistory] =
        useState([]);

    const [showHistory, setShowHistory] =
        useState(false);

    const searchRef = useRef(null);

    // LOAD SEARCH HISTORY
    useEffect(() => {
        const history = JSON.parse(
            localStorage.getItem(STORAGE_KEY) || "[]"
        );

        setSearchHistory(history);
    }, []);

    // SYNC LOCAL SEARCH WITH GLOBAL EMAIL
    useEffect(() => {
        setSearch(enteredEmail || "");
    }, [enteredEmail]);

    // HANDLE OUTSIDE CLICK
    useEffect(() => {
        const handleOutsideClick = (e) => {
            if (
                searchRef.current &&
                !searchRef.current.contains(e.target)
            ) {
                setShowHistory(false);
            }
        };

        document.addEventListener(
            "mousedown",
            handleOutsideClick
        );

        return () => {
            document.removeEventListener(
                "mousedown",
                handleOutsideClick
            );
        };
    }, []);

    // SAVE SEARCH HISTORY
    const saveSearchHistory = (value) => {
        const trimmedValue = value?.trim();

        if (!trimmedValue) return;

        let history = JSON.parse(
            localStorage.getItem(STORAGE_KEY) || "[]"
        );

        // REMOVE DUPLICATES
        history = history.filter(
            (item) => item.value !== trimmedValue
        );

        // ADD NEW HISTORY
        history.unshift({
            value: trimmedValue,
            time: new Date().toLocaleString(),
        });

        // LIMIT HISTORY
        history = history.slice(0, 3);

        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(history)
        );

        setSearchHistory(history);
    };

    // MAIN SEARCH
    const handleSearch = () => {
        const trimmedSearch = search?.trim();

        if (!trimmedSearch) {
            toast.error("Please enter an email");

            return;
        }

        // UPDATE GLOBAL CONTEXT
        setEnteredEmail(trimmedSearch);

        // SAVE HISTORY
        saveSearchHistory(trimmedSearch);

        // HIDE HISTORY
        setShowHistory(false);

        // TRIGGER SEARCH
        handleDateClick({
            email: trimmedSearch,
            navigate: "/",
        });
    };

    // ENTER KEY SEARCH
    const handleKeyPress = (e) => {
        if (e.key === "Enter") {
            handleSearch();
        }
    };

    // COPY EMAIL
    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(
                search
            );

            setCopied(true);

            setTimeout(() => {
                setCopied(false);
            }, 1500);
        } catch (err) {
            console.error(
                "Copy failed",
                err
            );
        }
    };

    // HISTORY CLICK
    const handleHistoryClick = (
        value
    ) => {
        setSearch(value);

        setEnteredEmail(value);

        saveSearchHistory(value);

        setShowHistory(false);

        handleDateClick({
            email: value,
            navigate: "/",
        });
    };

    // CLEAR SEARCH
    const handleInputClear = () => {
        setSearch("");

        setEnteredEmail("");

        handleClear();

        setShowHistory(false);
    };

    return (
        <div
            ref={searchRef}
            data-tour="top-nav-search"
            className="
            relative flex w-full min-w-0 p-1
            items-center rounded-full
            border border-gray-300 bg-white
            shadow-[0_4px_8px_rgba(0,0,0,0.22)]
            lg:w-[450px] lg:max-w-[60vw]
        "
        >
            {/* SEARCH ICON */}
            <Search
                className="
                ml-3 h-5 w-5 shrink-0
                text-gray-400
                lg:ml-6
            "
            />

            {/* INPUT */}
            <input
                value={search}
                onFocus={() => setShowHistory(true)}
                onChange={(e) => setSearch(e.target.value)}
                autoComplete="off"
                onKeyDown={handleKeyPress}
                placeholder="Search anything..."
                className="
                w-0 min-w-0 flex-1
                bg-transparent
                px-2
                text-sm text-gray-700
                placeholder:text-gray-400
                focus:outline-none
                sm:text-base
            "
            />

            {/* COPY BUTTON */}
            {search && (
                <motion.button
                    type="button"
                    whileTap={{ scale: 0.9 }}
                    onClick={handleCopy}
                    aria-label="Copy search text"
                    className="
                    mr-1 flex h-7 w-7 shrink-0
                    items-center justify-center
                    rounded-full
                    text-blue-600
                    transition hover:bg-blue-50
                    sm:mr-2 sm:h-8 sm:w-8
                "
                >
                    {copied ? (
                        <Check className="h-4 w-4" />
                    ) : (
                        <Copy className="h-4 w-4" />
                    )}
                </motion.button>
            )}

            {/* CLEAR BUTTON */}
            {search && (
                <motion.button
                    type="button"
                    whileTap={{ scale: 0.9 }}
                    onClick={handleInputClear}
                    aria-label="Clear search"
                    className="
                    mr-1 flex h-7 w-7 shrink-0
                    items-center justify-center
                    rounded-full
                    text-red-500
                    transition hover:bg-red-50
                    sm:mr-2 sm:h-8 sm:w-8
                "
                >
                    <X className="h-4 w-4" />
                </motion.button>
            )}

            {/* SEARCH BUTTON */}
            <button
                type="button"
                onClick={handleSearch}
                aria-label="Search"
                className="
                flex shrink-0 items-center justify-center rounded-full
                bg-gradient-to-r from-search-primary to-search-secondary
                h-8 w-8
                text-base font-small text-white
                transition
                hover:bg-blue-700
                active:scale-[0.98]
                sm:h-auto sm:w-auto sm:px-4 sm:py-1
            "
            >
                <Search className="h-4 w-4 sm:hidden" />
                <span className="hidden sm:inline">Search</span>
            </button>

            {/* SEARCH HISTORY */}
            {showHistory && searchHistory.length > 0 && (
                <div
                    className="
                    absolute left-0 right-0 top-full
                    z-999 mt-3
                    overflow-hidden rounded-2xl
                    border border-gray-200
                    bg-white shadow-2xl
                "
                >
                    <div
                        className="
                        border-b bg-gray-50
                        p-2 text-xs font-semibold
                        text-gray-500
                    "
                    >
                        Recent Searches
                    </div>

                    {searchHistory.map((item, index) => (
                        <button
                            key={index}
                            type="button"
                            onClick={() =>
                                handleHistoryClick(item.value)
                            }
                            className="
                            w-full border-b
                            px-4 py-3 text-left
                            transition
                            last:border-b-0
                            hover:bg-blue-50
                        "
                        >
                            <div className="flex items-center justify-between gap-3">
                                <div className="flex min-w-0 items-center gap-2">
                                    <Search className="h-4 w-4 shrink-0 text-blue-600" />

                                    <span className="truncate text-sm text-gray-700">
                                        {item.value}
                                    </span>
                                </div>

                                <span className="whitespace-nowrap text-[10px] text-gray-400">
                                    {item.time}
                                </span>
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default GlobalSearch;