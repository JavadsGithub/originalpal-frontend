/**
 * Shown instead of the order screens when the session holds no `orders:read`.
 *
 * It says what is missing rather than rendering an empty table, because the API would answer `403
 * FORBIDDEN` to every read this screen makes — an empty list would look like "no orders", which is a
 * different fact.
 */
export function OrdersPermissionNotice() {
  return (
    <div className="space-y-2 rounded-xl border border-dashed border-border p-6 text-sm" data-testid="orders-forbidden">
      <h1 className="text-base font-semibold text-foreground">Orders need the `orders:read` permission</h1>
      <p className="text-muted-foreground">
        This account is signed in but holds no `orders:read`, so `GET /api/orders/` answers `403
        FORBIDDEN`. An administrator can grant it through Roles &amp; permissions.
      </p>
    </div>
  );
}

export default OrdersPermissionNotice;
