import {
  Calendar,
  Clapperboard,
  Trash,
  Tag,
  MemoryStick,
  Edit,
  BadgeDollarSign,
} from "lucide-react";
import { useEffect, useState } from "react";
import TableView, { Table } from "../ui/table/Table";
import TableTitleBar from "../ui/table/TableTitleBar";
import { LoadingChase } from "../Loading.jsx";
import { useTablePreference } from "../../hooks/useTablePreference.js";
import { useCreateTag, useDeleteTag, useInfiniteTags, useUpdateTag } from "../../queries/tag.queries.js";
import UpdatePopup from "../UpdatePopup.jsx";

export function TagManagerpage() {
  const [open, setOpen] = useState(false)

  const preferences =
    useTablePreference(
      "tag"
    );

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isPending,
  } =
    useInfiniteTags(
      preferences
    );

  const {
    mutate: deleteTag,
    isPending: deleting,
    variables: deleteId
  } =
    useDeleteTag();
  const {
    mutate: updateTag,
    isPending: updating, } =
    useUpdateTag();
  const {
    mutate: createTag,
    isPending: creating } =
    useCreateTag();


  const columns = [
    {
      label: "Created At",
      accessor: "date_entered",
      icon: Calendar,
      render: (row) => <span>{row.date_entered_time_ago}</span>,
    },
    {
      label: "Tag Name",
      accessor: "name",
      icon: Tag,
      searchable: true,

      render: (row) => <span>{row.name}</span>,
    },
    {
      label: "Memo No.",
      accessor: "memo_c",
      icon: MemoryStick,
      searchable: true,

      render: (row) => <span>{row?.memo_c}</span>,
    },
    {
      label: "Type",
      accessor: "type",
      icon: BadgeDollarSign,
      render: (row) => <span>{row?.type}</span>,
    },
    {
      label: "Modified At",
      accessor: "date_modified",
      icon: Calendar,
      render: (row) => <span>{row?.date_modified_time_ago}</span>,
    },
    {
      label: "Action",
      accessor: "action",
      icon: Clapperboard,
      classes: "ml-auto",
      headerClasses: "ml-auto",
      render: (row) => (
        <div className="flex gap-2 ">
          {/* ✅ EDIT */}
          <button
            onClick={() => setOpen(row)}
            className="p-2 bg-blue-100 rounded"
          >
            <Edit className="w-4 h-4 text-blue-600" />
          </button>

          {/* ✅ DELETE */}
          {deleting && deleteId === row.id ? (
            <LoadingChase size="20" color="red" />
          ) : (
            <button
              onClick={() => deleteTag(row.id)}
              className="p-2 bg-red-100 rounded"
            >
              <Trash className="w-4 h-4 text-red-600" />
            </button>
          )}
        </div>
      ),
    },
  ];
  const tags =
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
  return (
    <>
      {open && <UpdatePopup
        open={open}
        loading={updating || creating}
        onClose={() => setOpen(false)}
        title="Create Tag"
        fields={[
          {
            label: "Tag Name",
            name: "name",
            type: "text",
            value: open?.name,
            required: true,
          },
          {
            label: "Tag Type",
            name: "type",
            type: "select",
            options: [{ label: "Static", value: "static" }, { label: "Dynamic", value: "dynamic" }],
            value: open?.type ?? "static",
            required: true
          },
        ]}
        onUpdate={(data) => open?.name ? updateTag({ ...open, ...data }, { onSuccess: setOpen(false) }) : createTag({ ...data }, { onSuccess: setOpen(false) })}
        buttonLabel={open?.name ? "Update" : "Create"}
      />}
      <TableView
        tableData={tags}
        tableName={"Tag Manager"}
        columns={columns}
        slice={"tag"}
        pageIndex={pageIndex}
        pageCount={pageCount}
        count={count}
        loading={loading}
        preferences={preferences}
        refreshKey={["tags"]}
        canAdd={true}
        handleAddClick={() => setOpen({ type: "", name: "" })}
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
          Icon={Tag}
          title={"Tag Manager"}
          titleClass={"text-orange-500"}
        />


        <Table
          headerStyle={"bg-orange-500"}
          layoutStyle={
            "grid grid-cols-6"
          }
        />      </TableView>


    </>
  );
}
