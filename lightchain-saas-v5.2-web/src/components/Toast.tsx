import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { assetUrl } from "../utils/assets";

const toastEase = [0.22, 1, 0.36, 1] as const;

export function Toast({ message, variant = "success" }: { message: string; variant?: "success" | "error" }) {
  const reduceMotion = useReducedMotion();
  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {message ? (
        <motion.div
          className="toast-viewport"
          initial={reduceMotion ? false : { opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduceMotion ? undefined : { opacity: 0, y: -6 }}
          transition={{ duration: reduceMotion ? 0 : 0.2, ease: toastEase }}
        >
          <div className={`beta-toast beta-toast--${variant}`} role={variant === "error" ? "alert" : "status"} aria-live={variant === "error" ? "assertive" : "polite"}>
            <div className="beta-toast__content">
              <span className="beta-toast__icon" aria-hidden="true">
                <img src={assetUrl(`assets/figma-icons/${variant === "error" ? "exclamation" : "success"}.svg`)} alt="" />
              </span>
              <span>{message}</span>
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
