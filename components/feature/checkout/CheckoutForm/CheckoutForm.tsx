"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import useGetCart from "@/data/feature/cart/useGetCart";
import useGetDeliveryOptions from "@/data/feature/checkout/useGetDeliveryOptions";
import useCheckoutCart from "@/data/feature/checkout/useCheckoutCart";
import { getStoredCartId, rememberGuestOrderToken, setStoredCartId } from "@/lib/cart-storage";
import { hasCheckoutErrors, validateCheckoutForm, type CheckoutFormValues } from "@/lib/order-rules";
import Link from "next/link";
import CheckoutFormUI from "./index";

const EMPTY: CheckoutFormValues = {
  contactName: "",
  contactEmail: "",
  contactPhone: "",
  city: "",
  addressLine1: "",
  postalCode: "",
  deliveryMethod: "",
};

/**
 * Tier 2 injector for checkout.
 *
 * The city is debounced before it is sent to `/api/delivery/options`, and the returned table both fills
 * the method radio group and prices the total — the delivery fee never comes from the client.
 *
 * Submitting posts `/api/checkouts/`, which **keeps the cart**: the use case first looks for an
 * `awaiting_payment` order for that cart and returns it unchanged, so the same cart would keep leading
 * back to the same order however much the shopper adds to it. The browser therefore drops its cart id on
 * success and remembers the order's guest token instead, so the next "add to cart" starts a fresh cart
 * while the placed order stays reachable across reloads (`lib/cart-storage.ts`).
 */
export default function CheckoutForm() {
  const router = useRouter();
  const [cartId] = useState<string | null>(() => getStoredCartId());
  const [values, setValues] = useState<CheckoutFormValues>(EMPTY);
  const [debouncedCity, setDebouncedCity] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { cart, isLoading, error } = useGetCart(cartId);
  const { options, isLoading: deliveriesLoading, error: deliveriesError } = useGetDeliveryOptions(debouncedCity);
  const checkout = useCheckoutCart();

  // Debounce the city: it drives a request, and typing one letter at a time would fire several.
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedCity(values.city), 300);
    return () => clearTimeout(timer);
  }, [values.city]);

  /**
   * The method that will actually be sent, **derived** rather than stored: the API's table for the
   * current city decides. The shopper's own pick wins while it is still on offer, and the first option
   * (or nothing) is used otherwise — so switching city never leaves a method from the previous one
   * selected, and no effect has to synchronise state to make that true.
   */
  const deliveryMethod = options.some((option) => option.method === values.deliveryMethod)
    ? values.deliveryMethod
    : (options[0]?.method ?? "");

  if (isLoading) {
    return (
      <p className="text-sm text-muted-foreground" data-testid="checkout-loading">
        Loading your cart...
      </p>
    );
  }

  if (!cart || error?.isNotFound) {
    return (
      <div className="space-y-2 text-sm" data-testid="checkout-no-cart">
        <p className="text-muted-foreground">
          There is nothing to check out — no cart in this browser, or the cart is gone.
        </p>
        <Link href="/search" className="font-semibold text-foreground hover:underline">
          Browse products →
        </Link>
      </div>
    );
  }

  const errors = validateCheckoutForm({ ...values, deliveryMethod });

  return (
    <CheckoutFormUI
      cart={cart}
      values={{ ...values, deliveryMethod }}
      errors={errors}
      deliveryOptions={options}
      deliveriesLoading={deliveriesLoading && debouncedCity.length > 0}
      cityUnsupported={Boolean(deliveriesError)}
      submitting={checkout.isPending}
      submitError={submitError}
      callbacks={{
        onChange: (next) => {
          setValues(next);
          setSubmitError(null);
        },
        onSubmit: () => {
          if (hasCheckoutErrors(errors) || !cartId) return;
          setSubmitError(null);

          checkout.mutate(
            {
              cart_id: cartId,
              contact_name: values.contactName.trim(),
              contact_email: values.contactEmail.trim().toLowerCase(),
              contact_phone: values.contactPhone.trim() || null,
              city: values.city.trim(),
              address_line1: values.addressLine1.trim(),
              postal_code: values.postalCode.trim(),
              delivery_method: deliveryMethod,
            },
            {
              onSuccess: (order) => {
                rememberGuestOrderToken(order.id, order.guest_access_token);
                setStoredCartId(null);
                router.push(`/orders/${order.id}`);
              },
              onError: (mutationError) => setSubmitError(mutationError.message),
            },
          );
        },
      }}
    />
  );
}
