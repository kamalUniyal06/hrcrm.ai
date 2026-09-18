import React, {
    createContext,
    useCallback,
    useContext,
    useMemo,
    useState,
} from "react";

const AttendanceContext = createContext(null);

const getMonthStart = (date) => {
    return new Date(
        date.getFullYear(),
        date.getMonth(),
        1
    );
};

export const AttendanceProvider = ({ children }) => {
    const [currentDate, setCurrentDate] = useState(
        getMonthStart(new Date())
    );

    const [selectedDate, setSelectedDate] = useState(null);

    const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);

    const goToPreviousMonth = useCallback(() => {
        setCurrentDate((prev) => {
            return new Date(
                prev.getFullYear(),
                prev.getMonth() - 1,
                1
            );
        });
    }, []);

    const goToNextMonth = useCallback(() => {
        setCurrentDate((prev) => {
            return new Date(
                prev.getFullYear(),
                prev.getMonth() + 1,
                1
            );
        });
    }, []);

    const goToToday = useCallback(() => {
        setCurrentDate(getMonthStart(new Date()));
    }, []);

    const selectDate = useCallback((date) => {
        setSelectedDate(date);
    }, []);

    const openRequestModal = useCallback((date = null) => {
        if (date) {
            setSelectedDate(date);
        }

        setIsRequestModalOpen(true);
    }, []);

    const closeRequestModal = useCallback(() => {
        setIsRequestModalOpen(false);
    }, []);

    const month = useMemo(() => {
        return `${currentDate.getFullYear()}-${String(
            currentDate.getMonth() + 1
        ).padStart(2, "0")}`;
    }, [currentDate]);

    const value = useMemo(
        () => ({
            currentDate,
            selectedDate,
            month,

            goToPreviousMonth,
            goToNextMonth,
            goToToday,

            selectDate,

            isRequestModalOpen,
            openRequestModal,
            closeRequestModal,
        }),
        [
            currentDate,
            selectedDate,
            month,
            goToPreviousMonth,
            goToNextMonth,
            goToToday,
            selectDate,
            isRequestModalOpen,
            openRequestModal,
            closeRequestModal,
        ]
    );

    return (
        <AttendanceContext.Provider value={value}>
            {children}
        </AttendanceContext.Provider>
    );
};

export const useAttendanceContext = () => {
    const context = useContext(AttendanceContext);

    if (!context) {
        throw new Error(
            "useAttendanceContext must be used inside AttendanceProvider"
        );
    }

    return context;
};