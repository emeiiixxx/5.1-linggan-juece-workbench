import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { Button } from "./Button";

export type DownloadFormat = "html" | "ppt" | "pdf";

const formats: { value: DownloadFormat; label: string }[] = [
  { value: "html", label: "HTML" },
  { value: "ppt", label: "PPT" },
  { value: "pdf", label: "PDF" },
];

export function DownloadFormatMenu({
  onSelect,
  triggerLabel = "下载",
  triggerStyle = "plain",
}: {
  onSelect: (format: DownloadFormat) => void | Promise<void>;
  triggerLabel?: string;
  triggerStyle?: "plain" | "outline";
}) {
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({ top: -9999, left: -9999 });
  const rootRef = useRef<HTMLSpanElement>(null);
  const menuRef = useRef<HTMLSpanElement>(null);
  const menuId = useId();

  useLayoutEffect(() => {
    if (!open) return;
    const updatePosition = () => {
      const trigger = rootRef.current?.querySelector("button");
      const menu = menuRef.current;
      if (!trigger || !menu) return;

      const gap = 4;
      const viewportMargin = 8;
      const triggerRect = trigger.getBoundingClientRect();
      const menuRect = menu.getBoundingClientRect();
      const openAbove = triggerRect.bottom + gap + menuRect.height > window.innerHeight - viewportMargin
        && triggerRect.top - gap - menuRect.height >= viewportMargin;
      const top = openAbove ? triggerRect.top - gap - menuRect.height : triggerRect.bottom + gap;
      const preferredLeft = triggerRect.left + menuRect.width <= window.innerWidth - viewportMargin
        ? triggerRect.left
        : triggerRect.right - menuRect.width;

      setMenuStyle({
        top: Math.max(viewportMargin, Math.min(top, window.innerHeight - menuRect.height - viewportMargin)),
        left: Math.max(viewportMargin, Math.min(preferredLeft, window.innerWidth - menuRect.width - viewportMargin)),
      });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const closeOnOutsidePress = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!rootRef.current?.contains(target) && !menuRef.current?.contains(target)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsidePress);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePress);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  const triggerProps = {
    "aria-controls": menuId,
    "aria-expanded": open,
    "aria-haspopup": "menu" as const,
    onClick: () => setOpen((current) => !current),
  };

  return (
    <span className="download-format-control" ref={rootRef}>
      {triggerStyle === "outline" ? (
        <Button variant="outline" size="small" {...triggerProps}>{triggerLabel}</Button>
      ) : (
        <button type="button" {...triggerProps}>{triggerLabel}</button>
      )}
      {open && typeof document !== "undefined" ? createPortal(
        <>
          <span className="download-format-menu__dismiss" aria-hidden="true" onPointerDown={() => setOpen(false)} />
          <span ref={menuRef} id={menuId} className="download-format-menu" role="menu" aria-label="选择下载格式" style={menuStyle}>
            {formats.map((format) => (
              <button
                key={format.value}
                type="button"
                className="download-format-menu__item"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  void onSelect(format.value);
                }}
              >
                {format.label}
              </button>
            ))}
          </span>
        </>,
        document.body,
      ) : null}
    </span>
  );
}
