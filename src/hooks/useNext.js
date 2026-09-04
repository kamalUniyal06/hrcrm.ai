import React, { useContext } from 'react'
import { PageContext } from '../context/pageContext';
import { useDispatch, useSelector } from 'react-redux';
import { useThreadContext } from './useThreadContext';
import { useNavigate } from 'react-router-dom';
import { useInfiniteEmails } from '../queries/email.queries';
import { useTablePreference } from './useTablePreference';

export const useNext = () => {
    const preferences = useTablePreference("emails");
    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isPending,
    } = useInfiniteEmails(preferences);
    const inboxEmails =
        data?.pages?.flatMap(
            (page) => page.records || page.data || []
        ) ?? [];
    const pages = data?.pages ?? [];

    const lastPage = pages[pages.length - 1] ?? {};
    const firstPage = pages[0] ?? {};

    const pageIndex = lastPage.page ?? 1;
    const pageCount = firstPage.total_pages ?? 0;
    const count = firstPage.total ?? 0;
    const { superfastReply, setEnteredEmail,
        currentIndex,
        handleDateClick, } = useContext(PageContext);
    const { handleMove } = useThreadContext();
    const navigate = useNavigate()
    const dispatch = useDispatch()

    const moveToNext = async (currentEmail) => {
        const currentIndex = inboxEmails.findIndex(
            (item) => item?.email1 === currentEmail
        );
        console.log("CURRENT INDEX", currentIndex, currentEmail, inboxEmails);

        if (currentIndex === -1) {
            navigate("/entity/inbox/list/table");
            return;
        }

        // Prefetch when close to end
        const remainingEmails = inboxEmails.length - currentIndex - 1;
        console.log("REMAINING EMAILS", remainingEmails, hasNextPage, isFetchingNextPage);
        if (
            remainingEmails <= 3 &&
            hasNextPage &&
            !isFetchingNextPage
        ) {
            await fetchNextPage();
        }

        const updatedEmails =
            data?.pages?.flatMap(
                (page) => page.records || page.data || []
            ) ?? inboxEmails;

        const nextEmailObj = updatedEmails[currentIndex + 1];
        console.log("NEXT EMAIL OBJ", nextEmailObj);
        if (!nextEmailObj) {
            localStorage.removeItem("email");
            setEnteredEmail("");
            navigate("/entity/inbox/list/table");
            return;
        }


        if (superfastReply) {
            handleDateClick({
                email: nextEmailObj?.email1,
                nextPrev: true,
                index: currentIndex + 1,
            });

            if (location.pathname.startsWith("/thread")) {
                handleMove({
                    email: nextEmailObj?.email1,
                    threadId: nextEmailObj?.thread_id,
                });
            }

            return;
        }

        handleDateClick({
            email: nextEmailObj?.email1,
            navigate: "/",
            nextPrev: true,
        });
    };
    return { moveToNext }
}
