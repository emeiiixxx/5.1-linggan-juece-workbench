import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { assetUrl } from "../utils/assets";

type TooltipPlacement = "top" | "right" | "bottom" | "left";

type IconControlProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  children: ReactNode;
  selected?: boolean;
  size?: "xsmall" | "small" | "medium" | "large";
  variant?: "ghost" | "bare" | "tonal";
  tooltipPlacement?: TooltipPlacement;
  showTooltip?: boolean;
};

export function IconControl({
  label,
  children,
  selected,
  size = "medium",
  variant = "ghost",
  tooltipPlacement = "top",
  showTooltip = true,
  className = "",
  "aria-describedby": ariaDescribedBy,
  onBlur,
  onFocus,
  onMouseEnter,
  onMouseLeave,
  onClick,
  autoFocus,
  ...props
}: IconControlProps) {
  const tooltipId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const hoverTimerRef = useRef<number | null>(null);
  const hoveredRef = useRef(false);
  const focusTooltipRef = useRef(false);
  const suppressInitialAutoFocusTooltipRef = useRef(Boolean(autoFocus));
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ left: 0, top: 0 });
  const describedBy = [ariaDescribedBy, showTooltip ? tooltipId : undefined]
    .filter(Boolean)
    .join(" ");

  const clearHoverTimer = useCallback(() => {
    if (hoverTimerRef.current !== null) {
      window.clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
  }, []);

  const updateTooltipPosition = useCallback(() => {
    const button = buttonRef.current;
    if (!button) return;

    const rect = button.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    if (tooltipPlacement === "top") {
      setTooltipPosition({ left: centerX, top: rect.top - 8 });
    } else if (tooltipPlacement === "right") {
      setTooltipPosition({ left: rect.right + 8, top: centerY });
    } else if (tooltipPlacement === "bottom") {
      setTooltipPosition({ left: centerX, top: rect.bottom + 8 });
    } else {
      setTooltipPosition({ left: rect.left - 8, top: centerY });
    }
  }, [tooltipPlacement]);

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

  useEffect(() => clearHoverTimer, [clearHoverTimer]);

  const handleMouseEnter: ButtonHTMLAttributes<HTMLButtonElement>["onMouseEnter"] = (event) => {
    hoveredRef.current = true;
    clearHoverTimer();
    if (showTooltip) {
      hoverTimerRef.current = window.setTimeout(() => setTooltipOpen(true), 300);
    }
    onMouseEnter?.(event);
  };

  const handleMouseLeave: ButtonHTMLAttributes<HTMLButtonElement>["onMouseLeave"] = (event) => {
    hoveredRef.current = false;
    clearHoverTimer();
    if (!focusTooltipRef.current) setTooltipOpen(false);
    onMouseLeave?.(event);
  };

  const handleFocus: ButtonHTMLAttributes<HTMLButtonElement>["onFocus"] = (event) => {
    clearHoverTimer();
    const suppressAutoFocusTooltip = suppressInitialAutoFocusTooltipRef.current;
    suppressInitialAutoFocusTooltipRef.current = false;
    focusTooltipRef.current = !suppressAutoFocusTooltip && event.currentTarget.matches(":focus-visible");
    if (showTooltip && focusTooltipRef.current) setTooltipOpen(true);
    onFocus?.(event);
  };

  const handleBlur: ButtonHTMLAttributes<HTMLButtonElement>["onBlur"] = (event) => {
    focusTooltipRef.current = false;
    if (!hoveredRef.current) setTooltipOpen(false);
    onBlur?.(event);
  };

  const handleClick: ButtonHTMLAttributes<HTMLButtonElement>["onClick"] = (event) => {
    clearHoverTimer();
    setTooltipOpen(false);
    onClick?.(event);
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className={`icon-control icon-control--${size} icon-control--${variant} ${selected ? "is-selected" : ""} ${className}`}
        aria-label={label}
        aria-describedby={describedBy || undefined}
        aria-pressed={selected === undefined ? undefined : selected}
        autoFocus={autoFocus}
        onBlur={handleBlur}
        onFocus={handleFocus}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        {...props}
      >
        <span className="icon-control__glyph" aria-hidden="true">
          {children}
        </span>
      </button>
      {showTooltip && tooltipOpen && typeof document !== "undefined" && createPortal(
        <span
          className="icon-control__tooltip"
          id={tooltipId}
          role="tooltip"
          data-placement={tooltipPlacement}
          style={tooltipPosition}
        >
          {label}
          <img className="icon-control__tooltip-arrow" src={assetUrl("assets/figma-icons/tooltip-arrow.svg")} alt="" />
        </span>,
        document.body,
      )}
    </>
  );
}
