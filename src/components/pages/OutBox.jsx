import React, { useContext, useEffect, useState } from "react";
import {
    Calendar,
    Mail,
    FileText,
    MessageSquareText,
    MailCheckIcon,
    Clapperboard,
    User,
    X,
    Send,
    Trash,
} from "lucide-react";
import TableView, { Table } from "../ui/table/Table";
import TableTitleBar from "../ui/table/TableTitleBar";
import IconButton from "../ui/Buttons/IconButton";
import { useThreadContext } from "../../hooks/useThreadContext";
import { PageContext } from "../../context/pageContext";
import { useDeleteOutboxEmail, useInfiniteOutboxEmails } from "../../queries/outbox.queries";


import {
    useTablePreference,
} from "../../hooks/useTablePreference";
const OutBox = () => {
    const { handleMove } = useThreadContext()
    const { handleDateClick } = useContext(PageContext)
    const preferences =
        useTablePreference(
            "outbox"
        );

    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isPending,
    } =
        useInfiniteOutboxEmails(
            preferences
        );

    const {
        mutate:
        deleteOutboxEmail,
        isPending:
        deleting,
        variables:
        deleteId,
    } =
        useDeleteOutboxEmail();

    // MODAL STATES
    const [selectedReply, setSelectedReply] =
        useState(null);

    const [showReplyModal, setShowReplyModal] =
        useState(false);


    // OPEN MODAL
    const handleSend = (row) => {
        handleMove({ email: row.client_email, threadId: row.threadId, reply: row.replyBody })
        deleteOutboxEmail(row.id);
        return

    }
    const handelDelete = (row) => {
        deleteOutboxEmail(
            row.id
        ); return

    }
    const openReplyModal = (row) => {
        setSelectedReply(row);
        setShowReplyModal(true);
    };

    const closeReplyModal = () => {
        setShowReplyModal(false);
        setSelectedReply(null);
    };
    const decodeHtml = (html) => {
        const txt = document.createElement("textarea");
        txt.innerHTML = html;
        return txt.value;
    };
    const outbox =
        data?.pages?.flatMap(
            (page) =>
                page.records ||
                page.data ||
                []
        ) ?? [];

    const pages =
        data?.pages ?? [];

    const lastPage =
        pages[
        pages.length - 1
        ] ?? {};

    const firstPage =
        pages[0] ?? {};

    const pageIndex =
        lastPage.page ?? 1;

    const pageCount =
        firstPage.total_pages ??
        0;

    const count =
        firstPage.total ?? 0;

    const loading =
        isPending ||
        isFetchingNextPage;
    const columns = [
        {
            label: "Date",
            accessor: "date_entered",
            icon: Calendar,
            classes: "truncate max-w-[180px]",
            onClick: (row, index) =>
                handleDateClick({ email: row.client_email, navigate: "/", index, nextPrev: true }),
            render: (row) => (
                <div className="flex flex-col cursor-pointer">
                    <span className="font-semibold text-gray-700">
                        {row?.date_entered_time_ago || "N/A"}
                    </span>
                </div>
            ),
        },

        {
            label: "Client Email",
            accessor: "client_email",
            icon: User,
            searchable: true,

            classes: "truncate max-w-[250px]",
            onClick: (row, index) =>
                handleDateClick({ email: row.client_email, navigate: "/contacts", index, nextPrev: true }),
            render: (row) => (
                <div className="flex items-center gap-2 cursor-pointer">
                    <div className="flex flex-col">
                        <span className="font-medium text-gray-700">
                            {row?.client_email || "N/A"}
                        </span>
                    </div>
                </div>
            ),
        },

        {
            label: "Description",
            accessor: "description",
            icon: FileText,
            searchable: true,

            classes: "truncate max-w-[350px]",

            render: (row) => (
                <div className="flex items-center">
                    <span className="font-medium text-gray-700 line-clamp-2">
                        {row?.description ||
                            "No description"}
                    </span>
                </div>
            ),
        },

        {
            label: "Reply Body",
            accessor: "replyBody",
            icon: MessageSquareText,
            searchable: true,

            classes: "truncate max-w-[400px]",

            render: (row) => (
                <div
                    onClick={() => openReplyModal(row)}
                    className="
            cursor-pointer
            hover:bg-blue-50
            transition-all
            duration-200
            rounded-xl
            p-2
          "
                >
                    <p className="text-sm text-gray-700 line-clamp-3">
                        {row?.replyBody
                            ? row.replyBody.replace(
                                /<[^>]+>/g,
                                ""
                            )
                            : "No reply body"}
                    </p>
                </div>
            ),
        },



        {
            label: "Action",
            accessor: "action",
            icon: Clapperboard,
            classes:
                "truncate max-w-[220px] ml-auto",
            headerClasses: "ml-auto",

            render: (row) => (
                <div className="flex items-center gap-2">
                    <IconButton icon={Send} onClick={() => handleSend(row)} size="sm" rounded="full" iconColor="green" />
                    <IconButton icon={Trash} onClick={() => handelDelete(row)} iconColor="red" size="sm" rounded="full" disabled={deleting} loading={deleteId == row.id && deleting} />
                </div>
            ),
        },
    ];

    return (
        <>
            {/* REPLY BODY MODAL */}
            {showReplyModal && (
                <div
                    onClick={closeReplyModal}
                    className="
            fixed inset-0 z-50
            bg-black/50 backdrop-blur-sm
            flex items-center justify-center
            p-4
          "
                >
                    {/* MODAL */}
                    <div
                        onClick={(e) =>
                            e.stopPropagation()
                        }
                        className="
              bg-white
              w-full max-w-5xl
              h-[85vh]
              rounded-3xl
              shadow-2xl
              overflow-hidden
              flex flex-col
            "
                    >
                        {/* HEADER */}
                        <div
                            className="
                flex items-center justify-between
                px-6 py-4
                border-b
                bg-gradient-to-r
                from-blue-600
                to-indigo-600
                text-white
              "
                        >
                            <div>
                                <h2 className="text-xl font-bold">
                                    Reply Preview
                                </h2>

                                <p className="text-sm text-white/80 mt-1">
                                    {
                                        selectedReply?.client_email
                                    }
                                </p>
                            </div>

                            <button
                                onClick={closeReplyModal}
                                className="
                  p-2 rounded-xl
                  hover:bg-white/20
                  transition
                "
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* BODY */}
                        <div className="flex-1 overflow-hidden bg-gray-100 p-4">
                            <div
                                className="
                  bg-white
                  h-full
                  rounded-2xl
                  shadow-inner
                  overflow-y-auto
                  custom-scrollbar
                  p-6
                "
                            ><div
                                    className="prose max-w-none"
                                    dangerouslySetInnerHTML={{
                                        __html: decodeHtml(
                                            selectedReply?.replyBody ||
                                            "<p>No Content</p>"
                                        ),
                                    }}
                                />
                            </div>
                        </div>

                        {/* FOOTER */}
                        <div
                            className="
                border-t
                px-6 py-4
                flex items-center justify-end gap-3
                bg-white
              "
                        >
                            {/* CANCEL */}
                            <button
                                onClick={closeReplyModal}
                                className="
                  px-5 py-2.5
                  rounded-xl
                  bg-red-100
                  text-red-700
                  hover:bg-red-200
                  transition-all
                  duration-200
                  font-medium
                  flex items-center gap-2
                "
                            >
                                Cancel
                            </button>

                            {/* SEND */}
                            <button
                                onClick={() => {
                                    handleSend(selectedReply)
                                }}
                                className="
                  px-5 py-2.5
                  rounded-xl
                  bg-green-600
                  text-white
                  hover:bg-green-700
                  transition-all
                  duration-200
                  font-medium
                  flex items-center gap-2
                  shadow-lg
                "
                            >
                                <Mail className="w-4 h-4" />
                                Send Mail
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* TABLE */}
            <div className="h-full">
                <TableView
                    tableData={outbox}
                    tableName={"Outbox"}
                    columns={columns}
                    slice={"outbox"}
                    loading={loading}
                    pageIndex={pageIndex}
                    pageCount={pageCount}
                    count={count}
                    preferences={preferences}
                    refreshKey={["outbox"]}
                    fetchNextPage={() => {
                        if (
                            hasNextPage &&
                            !isFetchingNextPage
                        ) {
                            fetchNextPage();
                        }
                    }}
                >
                    <TableTitleBar
                        Icon={Mail}
                        title={"Outbox"}
                        titleClass={"text-blue-700"}
                    />

                    <Table
                        headerStyle={"bg-blue-600"}
                        layoutStyle={`
              grid
              grid-cols-5
            `}
                    />
                </TableView>
            </div>
        </>
    );
};

export default OutBox;