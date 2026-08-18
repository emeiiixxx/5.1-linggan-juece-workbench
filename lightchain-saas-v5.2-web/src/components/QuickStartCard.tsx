import { useCallback, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type QuickStartCardProps = {
  text: string;
  onSelect?: (text: string) => void;
};

export function QuickStartCard({ text, onSelect }: QuickStartCardProps) {
  const tooltipId = useId();
  const cardRef = useRef<HTMLButtonElement>(null);
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ left: 0, top: 0 });

  const updateTooltipPosition = useCallback(() => {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    setTooltipPosition({
      left: rect.left + rect.width / 2,
      top: rect.top - 8,
    });
  }, []);

  useLayoutEffect(() => {
    if (!tooltipOpen) return;
    updateTooltipPosition();
    window.addEventListener("resize", updateTooltipPosition);
    window.addEventListener("scroll", updateTooltipPosition, true);
    return () => {
      window.removeEventListener("resize", updateTooltipPosition);
      window.removeEventListener("scroll", updateTooltipPosition, true);
    };
  }, [tooltipOpen, updateTooltipPosition]);

  return (
    <>
      <button
        ref={cardRef}
        type="button"
        className="quick-card"
        aria-describedby={tooltipId}
        onMouseEnter={() => setTooltipOpen(true)}
        onMouseLeave={() => setTooltipOpen(false)}
        onFocus={() => setTooltipOpen(true)}
        onBlur={() => setTooltipOpen(false)}
        onClick={() => {
          setTooltipOpen(false);
          onSelect?.(text);
        }}
      >
        <span className="quick-card__text">{text}</span>
      </button>
      {tooltipOpen && typeof document !== "undefined" ? createPortal(
        <span
          className="icon-control__tooltip quick-card__tooltip"
          id={tooltipId}
          role="tooltip"
          data-placement="top"
          style={tooltipPosition}
        >
          {text}
        </span>,
        document.body,
      ) : null}
    </>
  );
}
