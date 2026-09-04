import { useContext, useEffect, useRef, useState } from 'react'
import { SocketContext } from '../context/SocketContext';
import { useSelector } from 'react-redux';

const useRecordLock = ({ email, compareTo, page = [] }) => {
    const { activeUsers } = useContext(SocketContext)
    const [recordUsers, setRecordUsers] = useState([]);
    const activeOwner = useRef(null);
    const { user: currentUser } = useSelector(state => state.user)

    useEffect(() => {
        if (activeUsers) {
            const users = activeUsers
                .filter(
                    user =>
                        user[compareTo || "currentThread"] === email &&
                        user.status === "online" && page.find(p => p === user.page)).sort(
                            (a, b) =>
                                new Date(a.lastActiveAt) -
                                new Date(b.lastActiveAt)
                        );
            setRecordUsers(users)
            activeOwner.current = users[0]?.email;
        }
    }, [activeUsers]);
    const isLocked = activeOwner.current && activeOwner.current !== currentUser.email;
    // console.log("recordUsers", recordUsers);
    // console.log("isLocked", isLocked);

    return (
        { recordUsers, isLocked }
    )
}

export default useRecordLock