"use client";

import OrderStatusBadge from "@/components/feature/order/OrderStatusBadge/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { formatPriceCents } from "@/lib/types/catalog";
import { ORDER_STATUS_LABELS } from "@/lib/order-rules";
import { ORDER_STATUSES, type Order } from "@/lib/types/order";
import Link from "next/link";

export interface AdminOrderFilters {
  status: string;
  search: string;
}

export interface AdminOrdersTableTranslations {
  heading: string;
  description: string;
  statusLabel: string;
  allStatuses: string;
  searchLabel: string;
  searchPlaceholder: string;
  totalLabel: string;
  orderColumn: string;
  customerColumn: string;
  placedColumn: string;
  totalColumn: string;
  actionsColumn: string;
  viewText: string;
  emptyState: string;
  pageLabel: string;
  previousButtonText: string;
  nextButtonText: string;
  refundFlagText: string;
}

export interface AdminOrdersTableCallbacks {
  onFiltersChange: (filters: AdminOrderFilters) => void;
  onPageChange: (page: number) => void;
}

export interface AdminOrdersTableUIProps {
  orders: Order[];
  total: number;
  page: number;
  pages: number;
  filters: AdminOrderFilters;
  translations?: Partial<AdminOrdersTableTranslations>;
  callbacks: AdminOrdersTableCallbacks;
}

const defaultTranslations: AdminOrdersTableTranslations = {
  heading: "Orders",
  description:
    "Fulfilment and money actions are gated by their own permissions, and the API enforces the same order of operations the buttons here follow.",
  statusLabel: "Status",
  allStatuses: "All statuses",
  searchLabel: "Search",
  searchPlaceholder: "Order id, name or email",
  totalLabel: "orders",
  orderColumn: "Order",
  customerColumn: "Customer",
  placedColumn: "Placed",
  totalColumn: "Total",
  actionsColumn: "Status",
  viewText: "Open",
  emptyState: "No orders match this filter.",
  pageLabel: "Page",
  previousButtonText: "Previous",
  nextButtonText: "Next",
  refundFlagText: "refund needed",
};

/**
 * Tier 1 back-office order list.
 *
 * The status filter offers exactly the six enum values — anything else is a FastAPI `422` on the enum,
 * which the back office should never be able to send. Orders carrying `refund_required` are flagged
 * beside their status: cancelling a paid order does not move money, so the flag is the work queue.
 */
export default function AdminOrdersTableUI({
  orders,
  total,
  page,
  pages,
  filters,
  translations = {},
  callbacks,
}: AdminOrdersTableUIProps) {
  const t = { ...defaultTranslations, ...translations };

  return (
    <section className="space-y-4" data-testid="orders-table">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">{t.heading}</h1>
        <p className="max-w-3xl text-xs text-muted-foreground">{t.description}</p>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="orders-status">{t.statusLabel}</Label>
          <Select
            id="orders-status"
            data-testid="orders-status-filter"
            value={filters.status}
            onChange={(event) => callbacks.onFiltersChange({ ...filters, status: event.target.value })}
          >
            <option value="">{t.allStatuses}</option>
            {ORDER_STATUSES.map((status) => (
              <option key={status} value={status}>
                {ORDER_STATUS_LABELS[status]}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="orders-search">{t.searchLabel}</Label>
          <Input
            id="orders-search"
            data-testid="orders-search"
            placeholder={t.searchPlaceholder}
            value={filters.search}
            onChange={(event) => callbacks.onFiltersChange({ ...filters, search: event.target.value })}
          />
        </div>
      </div>

      <p className="text-xs text-muted-foreground" data-testid="orders-total">
        {total} {t.totalLabel}
      </p>

      {orders.length === 0 ? (
        <p
          className="rounded-lg border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground"
          data-testid="orders-empty"
        >
          {t.emptyState}
        </p>
      ) : (
        <div className="rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="border-b border-border text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-2 font-medium">{t.orderColumn}</th>
                <th className="px-4 py-2 font-medium">{t.customerColumn}</th>
                <th className="px-4 py-2 font-medium">{t.placedColumn}</th>
                <th className="px-4 py-2 font-medium">{t.totalColumn}</th>
                <th className="px-4 py-2 font-medium">{t.actionsColumn}</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {orders.map((order) => (
                <tr key={order.id} data-testid={`order-row-${order.id}`}>
                  <td className="px-4 py-2 font-mono text-xs">{order.id.slice(0, 8)}</td>
                  <td className="px-4 py-2">
                    <span className="block text-foreground">{order.contact_name}</span>
                    <span className="block text-xs text-muted-foreground">{order.contact_email}</span>
                  </td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">
                    {new Date(order.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-2">{formatPriceCents(order.total_cents)}</td>
                  <td className="px-4 py-2">
                    <OrderStatusBadge status={order.status} refundRequired={order.refund_required} />
                  </td>
                  <td className="px-4 py-2 text-right">
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="text-xs font-semibold hover:underline"
                    >
                      {t.viewText} →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <span className="text-xs text-muted-foreground">
            {t.pageLabel} {page} / {pages}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => callbacks.onPageChange(page - 1)}
          >
            {t.previousButtonText}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page >= pages}
            onClick={() => callbacks.onPageChange(page + 1)}
          >
            {t.nextButtonText}
          </Button>
        </div>
      )}
    </section>
  );
}
