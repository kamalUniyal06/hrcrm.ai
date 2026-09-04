import React, { useContext, useEffect, useState } from "react";
import { SocketContext } from "../context/SocketContext";
import { useDispatch, useSelector } from "react-redux";
import { PageContext } from "../context/pageContext";



function useIdle({ idle }) {
    const { setUserIdle, eventQueueRef, setEventQueue, } = useContext(SocketContext);
    const {
        enteredEmail,
        currentIndex,
    } = useContext(PageContext);
    const dispatch = useDispatch();
    const { emails, loading } = useSelector((state) => state.unreplied);
    const [firstEmail, setFirstEmail] = useState(null);

    const refreshLadger = () => {

    };
    useEffect(() => {
        if (emails?.length > 0) {
            setFirstEmail(
                emails[currentIndex].from?.match(/[\w.-]+@[\w.-]+\.\w+/)?.[0],
            );
        }
    }, [emails?.length, currentIndex]);
    useEffect(() => {
        setUserIdle(idle)
        return () => {
            setUserIdle(true)
            // flushQueue()
        }
    }, [])
    return [refreshLadger
    ];
}

export default useIdle;
