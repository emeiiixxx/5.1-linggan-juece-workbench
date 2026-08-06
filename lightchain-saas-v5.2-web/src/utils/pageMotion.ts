import type { Variants } from "motion/react";

export const primaryPageEntrance: Variants = {
  hidden: {},
  visible: {
    transition: {
      delayChildren: 0.04,
      staggerChildren: 0.065,
    },
  },
};

export const primaryPageEntranceItem: Variants = {
  hidden: {
    opacity: 0,
    y: 12,
    filter: "blur(4px)",
  },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: {
      duration: 0.38,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

// Keep backdrop-filter descendants on their own compositor path. Applying a
// filter to an ancestor prevents the glass layer from sampling the page behind it.
export const primaryPageEntranceMediaItem: Variants = {
  hidden: {
    opacity: 0,
    y: 12,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.38,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

export const primaryPageEntranceFadeItem: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.3,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};
