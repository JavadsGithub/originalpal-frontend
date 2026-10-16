/**
 * Local persistence for the two capabilities the API hands the browser instead of a session.
 *
 * The backend models guest shopping with **unguessable identifiers**, not cookies: a cart has no
 * owner (`POST /api/carts/` is anonymous) and an order's public read needs its `guest_access_token`.
 * Neither is attached to the session, so the client is what remembers them — and they only ever live
 * in `localStorage`, never in a URL the server sees (`docs/integration/contract-audit.md` §13).
 */

const CART_KEY = "originalpal.cart-id";
const ORDER_TOKENS_KEY = "originalpal.guest-order-tokens";

function safeRead(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeWrite(key: string, value: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    /* private mode: the cart simply does not survive a reload */
  }
}

/** The cart id of this browser, or `null` when nothing has been added yet. */
export function getStoredCartId(): string | null {
  return safeRead(CART_KEY);
}

export function setStoredCartId(cartId: string | null): void {
  safeWrite(CART_KEY, cartId);
}

/** Remembers a guest order's access token so the confirmation page survives a reload. */
export function rememberGuestOrderToken(orderId: string, token: string): void {
  const tokens = readGuestOrderTokens();
  tokens[orderId] = token;
  safeWrite(ORDER_TOKENS_KEY, JSON.stringify(tokens));
}

export function getGuestOrderToken(orderId: string): string | null {
  return readGuestOrderTokens()[orderId] ?? null;
}

export function forgetGuestOrderToken(orderId: string): void {
  const tokens = readGuestOrderTokens();
  delete tokens[orderId];
  safeWrite(ORDER_TOKENS_KEY, JSON.stringify(tokens));
}

function readGuestOrderTokens(): Record<string, string> {
  const raw = safeRead(ORDER_TOKENS_KEY);
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as Record<string, string>) : {};
  } catch {
    return {};
  }
}
