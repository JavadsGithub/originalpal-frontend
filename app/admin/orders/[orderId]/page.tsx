import AdminOrderDetail from "@/components/feature/order/AdminOrderDetail/AdminOrderDetail";
import { AuthGuard, PermissionGate } from "@/components/ui/auth-guard";
import { OrdersPermissionNotice } from "../_permission-notice";
import { Permissions } from "@/lib/permissions";

export interface AdminOrderPageProps {
  params: Promise<{ orderId: string }>;
}

/**
 * Back-office order detail: `GET /api/orders/{id}/admin` (note the suffix — plain `/orders/{id}` is the
 * guest read and wants the order's access token) plus the six transitions and the notification log.
 */
export default async function AdminOrderPage({ params }: AdminOrderPageProps) {
  const { orderId } = await params;

  return (
    <AuthGuard>
      <PermissionGate permission={Permissions.Orders_Read} fallback={<OrdersPermissionNotice />}>
        <AdminOrderDetail orderId={orderId} />
      </PermissionGate>
    </AuthGuard>
  );
}
