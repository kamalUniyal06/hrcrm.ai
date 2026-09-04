import { createContext, useState } from "react";
export const ThreadContext = createContext();

export const ThreadContextProvider = (props) => {
    const [currentEmail, setCurrentEmail] = useState(localStorage.getItem("currentEmail") || null)
    const [currentThread, setCurrentThread] = useState(localStorage.getItem("currentThread") || null)

    const handleSetCurrent = ({ email = null, thread }) => {
        setCurrentEmail(email)
        setCurrentThread(thread)
        localStorage.setItem("currentEmail", email)
        localStorage.setItem("currentThread", thread)
    }
    const value = {
        currentEmail, setCurrentEmail, handleSetCurrent, currentThread, setCurrentThread
    };

    return (
        <ThreadContext.Provider value={value}>{props.children}</ThreadContext.Provider>
    );
};
