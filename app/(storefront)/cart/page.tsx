import CartView from "@/components/feature/cart/CartView/CartView";

/**
 * The guest cart (`/api/carts/…`). No session, no permission: the cart id in the browser's storage is
 * the whole capability.
 */
export default function StorefrontCartPage() {
  return <CartView />;
}
