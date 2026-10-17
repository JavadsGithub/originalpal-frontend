import MyOrderView from "@/components/feature/order/MyOrderView/MyOrderView";
import Link from "next/link";

export interface AccountOrderPageProps {
  params: Promise<{ orderId: string }>;
}

/** One of the customer's own orders; another customer's answers `404`, never `403`. */
export default async function AccountOrderPage({ params }: AccountOrderPageProps) {
  const { orderId } = await params;

  return (
    <div className="space-y-4">
      <Link href="/account/orders" className="text-xs text-muted-foreground hover:underline">
        ← All my orders
      </Link>
      <MyOrderView orderId={orderId} />
    </div>
  );
}
