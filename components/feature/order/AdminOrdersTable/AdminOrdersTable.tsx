"use client";

import { useState } from "react";
import useGetAdminOrders from "@/data/feature/order/useGetAdminOrders";
import AdminOrdersTableUI, { type AdminOrderFilters } from "./index";

const EMPTY_FILTERS: AdminOrderFilters = { status: "", search: "" };

/**
 * Tier 2 injector for the back-office order list.
 *
 * Changing a filter resets the page inside the handler — mirroring pagination in an effect is both
 * unnecessary and (in this codebase) a lint error.
 */
export default function AdminOrdersTable() {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<AdminOrderFilters>(EMPTY_FILTERS);

  const { orders, total, page: currentPage, pages, isLoading, error, refetch } = useGetAdminOrders({
    page,
    status: filters.status || undefined,
    search: filters.search || undefined,
  });

  if (isLoading) {
    return (
      <p className="text-sm text-muted-foreground" data-testid="orders-loading">
        Loading orders...
      </p>
    );
  }

  if (error) {
    return (
      <div className="space-y-2 text-sm text-destructive" data-testid="orders-error">
        <p>{error.message}</p>
        <button type="button" className="underline" onClick={refetch}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <AdminOrdersTableUI
      orders={orders}
      total={total}
      page={currentPage}
      pages={pages}
      filters={filters}
      callbacks={{
        onFiltersChange: (next) => {
          setFilters(next);
          setPage(1);
        },
        onPageChange: setPage,
      }}
    />
  );
}
