import NextPrev from "../../NextPrev";
import CopyButton from "../../CopyButton"
import { useNavigate, useOutletContext } from "react-router-dom";
import { useThreadContext } from "../../../hooks/useThreadContext";


const RightThreadHeader = () => {
    const { email } = useOutletContext()
    const { handleMove } = useThreadContext()
    return (
        <div className="flex w-full min-w-0 flex-wrap items-center gap-2 px-1 py-1.5 sm:w-auto sm:flex-nowrap sm:gap-3 sm:px-4 sm:py-3">
            {/* Left Section */}
            <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-fuchsia-500 px-2 py-1.5 text-white sm:flex-none sm:gap-4 sm:rounded-t-lg sm:px-4 sm:py-2">
                <span className="hidden shrink-0 text-sm opacity-90 sm:inline">Client:</span>
                <div
                    title={email}
                    className="min-w-0 truncate rounded-md bg-white px-2 py-1 text-xs font-medium text-gray-800 sm:px-3 sm:text-sm"
                >
                    {email}
                </div>
                <CopyButton text={email} />
            </div>

            {/* Right Section */}
            <div className="flex shrink-0 items-center justify-end">
                <NextPrev prevHandler={(email, threadId) => handleMove({ email, threadId })} nextHandler={(email, threadId) => handleMove({ email, threadId })} />
            </div>
        </div>
    );
};

export default RightThreadHeader;