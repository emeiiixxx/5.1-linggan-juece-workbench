const observedImages = new WeakSet<HTMLImageElement>();

function isRasterImage(image: HTMLImageElement) {
  if (image.dataset.imageTransition === "none" || image.classList.contains("progressive-image")) return false;
  const source = image.currentSrc || image.getAttribute("src") || "";
  return !source.startsWith("data:image/svg") && !source.split("?")[0]?.toLowerCase().endsWith(".svg");
}

function revealImage(image: HTMLImageElement, state: "ready" | "error") {
  image.classList.remove("is-image-ready", "is-image-error");
  image.classList.add(state === "ready" ? "is-image-ready" : "is-image-error");
}

function scheduleReveal(image: HTMLImageElement, state: "ready" | "error") {
  const scheduledSource = image.currentSrc || image.src;
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      if ((image.currentSrc || image.src) === scheduledSource) revealImage(image, state);
    });
  });
}

function prepareImage(image: HTMLImageElement) {
  if (!isRasterImage(image)) return;

  image.classList.add("site-image-transition");
  image.classList.remove("is-image-ready", "is-image-error");

  if (!observedImages.has(image)) {
    observedImages.add(image);
    image.addEventListener("load", () => scheduleReveal(image, "ready"));
    image.addEventListener("error", () => scheduleReveal(image, "error"));
  }

  if (image.complete) {
    scheduleReveal(image, image.naturalWidth > 0 ? "ready" : "error");
  }
}

function prepareImagesIn(node: Node) {
  if (node instanceof HTMLImageElement) prepareImage(node);
  if (node instanceof Element) node.querySelectorAll("img").forEach(prepareImage);
}

export function installImageTransitions() {
  prepareImagesIn(document.documentElement);

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === "attributes") {
        prepareImage(mutation.target as HTMLImageElement);
        return;
      }
      mutation.addedNodes.forEach(prepareImagesIn);
    });
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["src", "srcset"],
  });
}
