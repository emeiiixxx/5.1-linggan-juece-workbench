type ConversationScrollOptions = {
  behavior?: ScrollBehavior;
  block?: "start" | "center" | "end";
};

export function scrollWithinConversation(
  element: HTMLElement | null,
  { behavior = "smooth", block = "end" }: ConversationScrollOptions = {},
) {
  if (!element) return;
  const container = element.closest<HTMLElement>(".conversation-scroll");
  if (!container) return;

  const containerRect = container.getBoundingClientRect();
  const elementRect = element.getBoundingClientRect();
  const offset = block === "start"
    ? elementRect.top - containerRect.top
    : block === "center"
      ? elementRect.top - containerRect.top - (containerRect.height - elementRect.height) / 2
      : elementRect.bottom - containerRect.bottom;

  container.scrollTo({
    top: Math.max(0, container.scrollTop + offset),
    behavior,
  });
}
