import CheckoutForm from "@/components/feature/checkout/CheckoutForm/CheckoutForm";

/** Checkout: `/api/delivery/options?city=…` prices it, `POST /api/checkouts/` places it. */
export default function StorefrontCheckoutPage() {
  return <CheckoutForm />;
}
