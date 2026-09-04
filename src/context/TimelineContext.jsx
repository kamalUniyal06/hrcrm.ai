import {
    createContext,
    useContext,
    useMemo,
    useState,
    useEffect,
} from "react";

import { PageContext } from '../context/pageContext'
import { useInfiniteEmails } from "../queries/email.queries"
import { useTablePreference } from "../hooks/useTablePreference";
import { usePrefetchTimeline } from "../hooks/usePrefetchTimeline";
const TimelineContext = createContext(null);

export const TimelineProvider = ({ children }) => {
    const { enteredEmail } = useContext(PageContext);
    const preferences = useTablePreference("emails");
    const { data } = useInfiniteEmails(preferences);
    const emails =
        data?.pages?.flatMap(
            (page) => page.records || page.data || []
        ) ?? [];
    const [currentEmail, setCurrentEmail] = useState("");

    const [showBrandTimeline, setShowBrandTimeline] = useState(false);
    usePrefetchTimeline(
        emails,
        currentEmail
    );
    useEffect(() => {
        // if (currentEmail) return;

        const defaultEmail =
            enteredEmail ||
            emails?.[0]?.email1 ||
            "";

        if (defaultEmail) {
            setCurrentEmail(defaultEmail);
        }
    }, [
        enteredEmail,
        emails,
        currentEmail,
    ]);

    const value = useMemo(
        () => ({
            currentEmail,
            setCurrentEmail,

            emails,

            showBrandTimeline,
            setShowBrandTimeline,
        }),
        [
            currentEmail,
            emails,
            showBrandTimeline,
        ]
    );

    return (
        <TimelineContext.Provider value={value}>
            {children}
        </TimelineContext.Provider>
    );
};

export const useTimeline = () => {
    const context = useContext(TimelineContext);

    if (!context) {
        throw new Error(
            "useTimeline must be used inside TimelineProvider"
        );
    }

    return context;
};