import { useContext } from "react";
import { PageContext } from "../../context/pageContext";
import TableView from "../ui/table/Table";
import { useInfiniteOrders, useOrderStats } from "../../queries/orders.queries.js";
import { useTablePreference } from "../../hooks/useTablePreference.js";
import { useLayout } from "@/queries/layouts.queries.js";
import { LoadingProgress } from "../Loading";

export function OrdersPage() {
  const preferences = useTablePreference("orders");
  const { enteredEmail: email } = useContext(PageContext)
  const { data: layout, isPending: layoutPending } = useLayout('orders', "table")

  const STATUS_CONFIG = layout?.config?.statusConfig ?? []
  console.log("LAYOUT", layout)
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isPending,
  } = useInfiniteOrders({ preferences, email });
  if (!isPending) {

  }
  const {
    data: summary,
    isPending: summaryLoading,
  } = useOrderStats({ email });


  const loading = isPending || isFetchingNextPage;
  const statusList = STATUS_CONFIG.map((config) => {
    return {
      ...config,
      count: Number(summary?.stats?.[`${config.key}`]?.count || 0),
      amount: Number(summary?.stats?.[`${config.key}`]?.sum_of?.total_amount_c || 0)
    };
  });
  if (layoutPending) {
    return (
      <div className="flex h-full min-h-[70vh] items-center justify-center">
        <div className="flex flex-col items-center">
          <LoadingProgress color="blue" size="100" stroke="5" />
        </div>
      </div>
    );
  }

  return (
    <TableView
      data={data}
      layout={layout}
      tableName={"Orders"}
      slice={"orders"}
      statusList={statusList}
      loading={loading}
      preferences={preferences}
      refreshKey={["orders"]}
      fetchNextPage={fetchNextPage}
      hasNextPage={hasNextPage}
      isFetchingNextPage={isFetchingNextPage}
    >
    </TableView>
  );
}
