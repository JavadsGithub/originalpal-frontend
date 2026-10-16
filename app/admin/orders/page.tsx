import AdminOrdersTable from "@/components/feature/order/AdminOrdersTable/AdminOrdersTable";
import { AuthGuard, PermissionGate } from "@/components/ui/auth-guard";
import { OrdersPermissionNotice } from "./_permission-notice";
import { Permissions } from "@/lib/permissions";

/** Back-office order list. `orders:read` — the API itself answers 403 without it. */
export default function AdminOrdersPage() {
  return (
    <AuthGuard>
      <PermissionGate permission={Permissions.Orders_Read} fallback={<OrdersPermissionNotice />}>
        <AdminOrdersTable />
      </PermissionGate>
    </AuthGuard>
  );
}
