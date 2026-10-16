import MyOrdersTable from "@/components/feature/order/MyOrdersTable/MyOrdersTable";
import Link from "next/link";

/** `/api/me/orders/` — session-scoped, no permission (a self-registered account sees its own orders). */
export default function AccountOrdersPage() {
  return (
    <div className="space-y-4">
      <MyOrdersTable />
      <p className="text-xs text-muted-foreground">
        Order placed as a guest?{" "}
        <Link href="/orders/lookup" className="font-semibold hover:underline">
          Claim it with its access token
        </Link>{" "}
        — orders are not attached to accounts automatically.
      </p>
    </div>
  );
}
