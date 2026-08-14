import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useI18n } from "../i18n";
import { FigmaIcon } from "./FigmaIcon";

export const inspirationDesignOptions = [
  { value: "apparel", label: "服装设计", icon: "apparel-design-menu" },
  { value: "pattern", label: "图案设计", icon: "pattern-material" },
] as const;

export type InspirationDesignType = typeof inspirationDesignOptions[number]["value"];

type InspirationDesignSelectProps = {
  value: InspirationDesignType;
  onChange: (value: InspirationDesignType) => void;
  menuPlacement?: "above" | "below";
  onOpenChange?: (open: boolean) => void;
};

export function InspirationDesignSelect({
  value,
  onChange,
  menuPlacement = "below",
  onOpenChange,
}: InspirationDesignSelectProps) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const selectRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const selectedOption = inspirationDesignOptions.find((option) => option.value === value) ?? inspirationDesignOptions[0];

  const updateOpen = useCallback((nextOpen: boolean) => {
    setOpen(nextOpen);
    onOpenChange?.(nextOpen);
  }, [onOpenChange]);

  useEffect(() => {
    if (!open) return;
    const dismiss = (event: PointerEvent) => {
      if (!selectRef.current?.contains(event.target as Node)) updateOpen(false);
    };
    const dismissOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") updateOpen(false);
    };
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", dismissOnEscape);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("keydown", dismissOnEscape);
    };
  }, [open, updateOpen]);

  return (
    <div className="composer-profile-select inspiration-design-select" ref={selectRef}>
      <button
        type="button"
        className={`composer-select composer-select--profile ${open ? "is-open" : ""}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => updateOpen(!open)}
      >
        <FigmaIcon name={selectedOption.icon} size={16} />
        <span title={t(selectedOption.label)}>{t(selectedOption.label)}</span>
        <FigmaIcon name="chevron-right" size={16} className="composer-select__chevron" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            className={`composer-profile-menu composer-profile-menu--design inspiration-design-select__menu inspiration-design-select__menu--${menuPlacement}`}
            role="menu"
            aria-label={t("选择设计类型")}
            data-node-id="630:75840"
            initial={reduceMotion ? false : { opacity: 0, y: menuPlacement === "above" ? 6 : -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: menuPlacement === "above" ? 4 : -4, scale: 0.98 }}
            transition={{ duration: reduceMotion ? 0 : 0.2, ease: "easeOut" }}
          >
            <div className="composer-profile-menu__options">
              {inspirationDesignOptions.map((option) => (
                <button
                  type="button"
                  role="menuitem"
                  key={option.value}
                  onClick={() => {
                    onChange(option.value);
                    updateOpen(false);
                  }}
                >
                  <FigmaIcon name={option.icon} size={16} />
                  <span>{t(option.label)}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
