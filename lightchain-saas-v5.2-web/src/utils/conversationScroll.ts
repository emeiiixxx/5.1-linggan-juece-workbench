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
  const conversationStage = container.closest<HTMLElement>(".conversation-stage");
  const composerClearanceValue = conversationStage
    ? getComputedStyle(conversationStage).getPropertyValue("--conversation-composer-clearance")
    : "";
  const composerClearance = Math.max(0, Number.parseFloat(composerClearanceValue) || 0);
  const visibleTop = containerRect.top + 12;
  const visibleBottom = containerRect.bottom - composerClearance - 16;
  const visibleHeight = Math.max(0, visibleBottom - visibleTop);
  const offset = block === "start"
    ? elementRect.top - visibleTop
    : block === "center"
      ? elementRect.top - visibleTop - (visibleHeight - elementRect.height) / 2
      : elementRect.bottom - visibleBottom;

  container.scrollTo({
    top: Math.max(0, container.scrollTop + offset),
    behavior,
  });
}
