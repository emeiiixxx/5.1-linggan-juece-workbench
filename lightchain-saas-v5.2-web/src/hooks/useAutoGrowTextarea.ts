import { useLayoutEffect, useRef, useState } from "react";

export function useAutoGrowTextarea(
  value: string,
  minHeight: number,
  maxHeight = 320,
  chromeHeight = 64,
) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [height, setHeight] = useState(minHeight);

  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "0px";
    const contentHeight = textarea.scrollHeight;
    textarea.style.height = "";
    const nextHeight = Math.min(maxHeight, Math.max(minHeight, contentHeight + chromeHeight));
    setHeight((current) => current === nextHeight ? current : nextHeight);
  }, [chromeHeight, maxHeight, minHeight, value]);

  return { textareaRef, height };
}
