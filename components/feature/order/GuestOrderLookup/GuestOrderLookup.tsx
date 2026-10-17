"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/layout/auth-provider";
import useRequestGuestOrderAssociation from "@/data/feature/order/useAssociateGuestOrder";
import useConfirmGuestOrderAssociation from "@/data/feature/order/useConfirmGuestOrderAssociation";
import { rememberGuestOrderToken } from "@/lib/cart-storage";
import GuestOrderLookupUI from "./index";

/**
 * Tier 2 injector for `/orders/lookup`.
 *
 * Opening an order is a client-side navigation: the token is stored for that order and the page loads
 * it from there, so the token never has to be sent to the API by this screen. Claiming is the two API
 * calls, with the `verification_token` held in state between them.
 */
export default function GuestOrderLookup() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  const [orderId, setOrderId] = useState("");
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [verification, setVerification] = useState<{ token: string; expiresAt: string | null } | null>(null);

  const requestClaim = useRequestGuestOrderAssociation();
  const confirmClaim = useConfirmGuestOrderAssociation();

  return (
    <GuestOrderLookupUI
      orderId={orderId}
      token={token}
      submitting={requestClaim.isPending}
      errorMessage={error}
      canClaim={isAuthenticated}
      verificationToken={verification?.token ?? null}
      verificationExpiresAt={verification?.expiresAt ?? null}
      claimSubmitting={requestClaim.isPending || confirmClaim.isPending}
      claimError={error}
      callbacks={{
        onLookup: (nextOrderId, nextToken) => {
          setOrderId(nextOrderId);
          setToken(nextToken);
          setError(null);
        },
        onClaim: (claimOrderId, claimToken) => {
          setError(null);
          requestClaim.mutate(
            { orderId: claimOrderId.trim(), guestToken: claimToken.trim() },
            {
              onSuccess: (association) => {
                if (!association.verification_token) {
                  setError("The API accepted the request but returned no verification token.");
                  return;
                }
                setVerification({
                  token: association.verification_token,
                  expiresAt: association.expires_at,
                });
              },
              onError: (mutationError) => setError(mutationError.message),
            },
          );
        },
        onConfirm: (verificationToken) => {
          setError(null);
          confirmClaim.mutate(
            { verificationToken },
            {
              onSuccess: (order) => {
                rememberGuestOrderToken(order.id, order.guest_access_token);
                router.push(`/account/orders/${order.id}`);
              },
              onError: (mutationError) => setError(mutationError.message),
            },
          );
        },
      }}
    />
  );
}
