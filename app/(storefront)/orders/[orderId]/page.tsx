import GuestOrderView from "@/components/feature/order/OrderView/GuestOrderView";

export interface GuestOrderPageProps {
  params: Promise<{ orderId: string }>;
  searchParams: Promise<{ token?: string }>;
}

/**
 * The public order page a guest lands on after checkout.
 *
 * `?token=…` is honoured so a link that carries the access token works on any device (that is what a
 * confirmation email would carry, once the backend sends one), and the browser's own stored token is
 * the fallback.
 */
export default async function GuestOrderPage({ params, searchParams }: GuestOrderPageProps) {
  const { orderId } = await params;
  const { token } = await searchParams;

  return <GuestOrderView orderId={orderId} tokenFromUrl={token ?? null} />;
}
