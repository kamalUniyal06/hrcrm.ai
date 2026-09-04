import { createContext, useContext, useRef } from "react";
import LoadingBar from "react-top-loading-bar";

const LoadingBarContext = createContext();

export const useLoadingBar = () => useContext(LoadingBarContext);

export const LoadingBarProvider = ({ children }) => {
    const loadingRef = useRef(null);

    const start = () => {
        loadingRef.current?.continuousStart();
    };

    const complete = () => {
        loadingRef.current?.complete();
    };

    return (
        <LoadingBarContext.Provider
            value={{
                start,
                complete,
            }}
        >
            <LoadingBar
                color="#4ef63bff"
                height={3}
                shadow={true}
                ref={loadingRef}
            />

            {children}
        </LoadingBarContext.Provider>
    );
};