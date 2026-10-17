"use client";

import { useState } from "react";
import useGetMyOrders from "@/data/feature/order/useGetMyOrders";
import MyOrdersTableUI from "./index";

/**
 * Tier 2 injector for `/account/orders`.
 *
 * Session-scoped (`/api/me/orders/` needs no permission — a self-registered customer with zero
 * permissions must still see their own orders), one page at a time.
 */
export default function MyOrdersTable() {
  const [page, setPage] = useState(1);
  const { orders, total, page: currentPage, pages, isLoading, error, refetch } = useGetMyOrders({ page });

  if (isLoading) {
    return (
      <p className="text-sm text-muted-foreground" data-testid="my-orders-loading">
        Loading orders...
      </p>
    );
  }

  if (error) {
    return (
      <div className="space-y-2 text-sm text-destructive" data-testid="my-orders-error">
        <p>{error.message}</p>
        <button type="button" className="underline" onClick={refetch}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <MyOrdersTableUI
      orders={orders}
      total={total}
      page={currentPage}
      pages={pages}
      callbacks={{ onPageChange: setPage }}
    />
  );
}
