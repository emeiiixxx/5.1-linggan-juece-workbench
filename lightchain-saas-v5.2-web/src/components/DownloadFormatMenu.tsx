import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { Button } from "./Button";
import { useI18n } from "../i18n";

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
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({ top: -9999, left: -9999 });
  const rootRef = useRef<HTMLSpanElement>(null);
  const menuRef = useRef<HTMLSpanElement>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);
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
      if (event.key === "Escape") {
        setOpen(false);
        rootRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
      }
    };
    document.addEventListener("pointerdown", closeOnOutsidePress);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePress);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    window.requestAnimationFrame(() => itemRefs.current[0]?.focus());
  }, [open]);

  const moveMenuFocus = (event: ReactKeyboardEvent<HTMLButtonElement>, index: number) => {
    const lastIndex = formats.length - 1;
    let nextIndex = index;
    if (event.key === "ArrowDown") nextIndex = index === lastIndex ? 0 : index + 1;
    else if (event.key === "ArrowUp") nextIndex = index === 0 ? lastIndex : index - 1;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = lastIndex;
    else return;
    event.preventDefault();
    itemRefs.current[nextIndex]?.focus();
  };

  const triggerProps = {
    "aria-controls": menuId,
    "aria-expanded": open,
    "aria-haspopup": "menu" as const,
    onClick: () => setOpen((current) => !current),
  };

  return (
    <span className="download-format-control" ref={rootRef}>
      {triggerStyle === "outline" ? (
        <Button variant="outline" size="small" {...triggerProps}>{t(triggerLabel)}</Button>
      ) : (
        <button type="button" {...triggerProps}>{t(triggerLabel)}</button>
      )}
      {open && typeof document !== "undefined" ? createPortal(
        <>
          <span className="download-format-menu__dismiss" aria-hidden="true" onPointerDown={() => setOpen(false)} />
          <span ref={menuRef} id={menuId} className="download-format-menu" role="menu" aria-label={t("选择下载格式")} style={menuStyle}>
            {formats.map((format, index) => (
              <button
                key={format.value}
                type="button"
                className="download-format-menu__item"
                role="menuitem"
                ref={(element) => { itemRefs.current[index] = element; }}
                onKeyDown={(event) => moveMenuFocus(event, index)}
                onClick={() => {
                  setOpen(false);
                  void onSelect(format.value);
                  window.requestAnimationFrame(() => rootRef.current?.querySelector<HTMLButtonElement>("button")?.focus());
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
