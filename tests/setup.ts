import { afterAll, afterEach, beforeAll } from "vitest";
import { cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { server } from "./msw-server";

/**
 * jsdom ships no implementation of the `<dialog>` element API, which every `Dialog`-based component
 * uses to open itself. Polyfill just enough of it for assertions.
 */
function installDialogPolyfill() {
  const proto = globalThis.HTMLDialogElement?.prototype;
  if (!proto) return;

  if (!proto.showModal) {
    proto.showModal = function showModal(this: HTMLDialogElement) {
      this.setAttribute("open", "");
    };
  }

  if (!proto.show) {
    proto.show = proto.showModal;
  }

  if (!proto.close) {
    proto.close = function close(this: HTMLDialogElement) {
      this.removeAttribute("open");
      this.dispatchEvent(new Event("close"));
    };
  }
}

beforeAll(() => {
  installDialogPolyfill();

  // Fail loudly on unexpected calls: a test that forgets a handler should not silently pass.
  server.listen({ onUnhandledFrame: "error" });
});

afterEach(() => {
  server.resetHandlers();
  cleanup();
});

afterAll(() => {
  server.close();
});
