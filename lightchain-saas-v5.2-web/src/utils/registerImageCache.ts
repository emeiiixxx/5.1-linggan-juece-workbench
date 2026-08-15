import { assetUrl } from "./assets";

export function registerImageCache() {
  if (!("serviceWorker" in navigator)) return;

  window.addEventListener("load", () => {
    navigator.serviceWorker.register(assetUrl("sw.js"), { scope: import.meta.env.BASE_URL }).catch(() => {
      // The app remains fully usable when private browsing or local policy blocks service workers.
    });
  }, { once: true });
}
