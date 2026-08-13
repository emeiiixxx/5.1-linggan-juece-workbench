import { useEffect, useRef, type RefObject } from "react";

const focusableSelector = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

export function useModalFocus(
  dialogRef: RefObject<HTMLElement | null>,
  active: boolean,
  onClose: () => void,
  fallbackFocusRef?: RefObject<HTMLElement | null>,
) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!active) return;
    const previouslyFocused = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;

    const focusInitialControl = window.requestAnimationFrame(() => {
      const dialog = dialogRef.current;
      if (!dialog) return;
      const firstFocusable = Array.from(dialog.querySelectorAll<HTMLElement>(focusableSelector))
        .find((element) => !element.hidden && element.getAttribute("aria-hidden") !== "true");
      (firstFocusable ?? dialog).focus();
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab") return;

      const dialog = dialogRef.current;
      if (!dialog) return;
      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(focusableSelector))
        .filter((element) => !element.hidden && element.getAttribute("aria-hidden") !== "true");
      if (!focusable.length) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!dialog.contains(document.activeElement)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.cancelAnimationFrame(focusInitialControl);
      document.removeEventListener("keydown", handleKeyDown);
      window.requestAnimationFrame(() => {
        if (previouslyFocused?.isConnected) {
          previouslyFocused.focus();
          return;
        }
        const fallback = fallbackFocusRef?.current;
        if (!fallback?.isConnected) return;
        const hadTabIndex = fallback.hasAttribute("tabindex");
        fallback.setAttribute("tabindex", "-1");
        fallback.focus({ preventScroll: true });
        if (!hadTabIndex) fallback.addEventListener("blur", () => fallback.removeAttribute("tabindex"), { once: true });
      });
    };
  }, [active, dialogRef, fallbackFocusRef]);
}
