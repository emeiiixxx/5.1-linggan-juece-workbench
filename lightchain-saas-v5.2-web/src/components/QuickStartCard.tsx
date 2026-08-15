import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { FigmaIcon } from "./FigmaIcon";
import { useI18n } from "../i18n";

type QuickStartCardProps = {
  title: string;
  description: string;
  images: string[];
};

const collapsedPreview = [
  { x: 1, y: 4, width: 75, height: 112.5, rotate: 0 },
  { x: 1, y: 4, width: 75, height: 112.5, rotate: 0 },
  { x: 1, y: 4, width: 75, height: 112.5, rotate: 0 },
];

const expandedPreview = [
  { x: 109.58, y: 12.57, width: 66.667, height: 100, rotate: 10 },
  { x: 62.67, y: 2.5, width: 66.667, height: 100, rotate: 0 },
  { x: 4.74, y: 12.99, width: 66.667, height: 100, rotate: -10 },
];

export function QuickStartCard({ title, description, images }: QuickStartCardProps) {
  const { t } = useI18n();
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const reduceMotion = useReducedMotion();
  const expanded = hovered || focused;
  const transition = { duration: reduceMotion ? 0 : 0.3, ease: "easeOut" as const };
  return (
    <motion.button
      type="button"
      className={`quick-card ${expanded ? "is-expanded" : ""}`}
      animate={{ boxShadow: expanded ? "var(--shadow-m)" : "0 0 0 rgb(0 0 0 / 0)" }}
      transition={transition}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    >
      <motion.span
        className="quick-card__hover-surface"
        aria-hidden="true"
        animate={{ opacity: expanded ? 1 : 0 }}
        transition={transition}
      />

      <span className="quick-card__copy">
        <strong title={title}>{title}</strong>
        <span className="quick-card__description">
          <motion.small
            title={description}
            animate={{ opacity: expanded ? 0 : 1 }}
            transition={transition}
            aria-hidden={expanded}
          >
            {description}
          </motion.small>
          <motion.small
            className="quick-card__try"
            animate={{ opacity: expanded ? 1 : 0 }}
            transition={transition}
            aria-hidden={!expanded}
          >
            {t("点击试试")}
            <FigmaIcon name="arrow-down-right" size={16} />
          </motion.small>
        </span>
      </span>

      <motion.span
        className="quick-card__preview"
        aria-hidden="true"
        animate={{ x: expanded ? 0 : 95 }}
        transition={transition}
      >
        {images.map((src, index) => (
          <motion.img
            src={src}
            alt=""
            loading="lazy"
            decoding="async"
            key={`${src}-${index}`}
            initial={false}
            animate={expanded ? expandedPreview[index] : collapsedPreview[index]}
            transition={transition}
            style={{ transformOrigin: "50% 50%", willChange: "transform, width, height" }}
          />
        ))}
      </motion.span>
    </motion.button>
  );
}
