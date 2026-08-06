import { useEffect, useState } from "react";
import { motion, useAnimationControls, useReducedMotion } from "motion/react";
import { assetUrl } from "../utils/assets";

const figmaSpring = (value: number) =>
  1 -
  Math.exp(-value * 7.5232) *
    (Math.cos(value * 8.8463) + 0.8504 * Math.sin(value * 8.8463));

type GlassMotionProps = {
  paused?: boolean;
};

export function ArchiveHeaderMotion({ theme }: { theme: "dark" | "light" }) {
  const reduceMotion = useReducedMotion();
  const [cycle, setCycle] = useState(0);

  useEffect(() => {
    if (reduceMotion) return;
    const interval = window.setInterval(() => setCycle((value) => value + 1), 11000);
    return () => window.clearInterval(interval);
  }, [reduceMotion]);

  return (
    <img
      className="archive-header-motion"
      key={reduceMotion ? `${theme}-reduced` : `${theme}-${cycle}`}
      src={assetUrl(`assets/figma-icons/archive-header-${theme}.svg`)}
      alt=""
      aria-hidden="true"
    />
  );
}

export function GlassMotion({ paused = false }: GlassMotionProps) {
  const reduceMotion = useReducedMotion();
  const backControls = useAnimationControls();
  const frontControls = useAnimationControls();

  useEffect(() => {
    if (reduceMotion) {
      backControls.stop();
      frontControls.stop();
      backControls.set({ rotate: 0, x: 0, y: 0 });
      frontControls.set({ rotate: 0, x: 0, y: 0 });
      return;
    }

    if (paused) {
      backControls.stop();
      frontControls.stop();
      return;
    }

    void backControls.start({
      rotate: [0, 0, 5, 5],
      x: [0, 0, 1.397, 1.397],
      y: [0, 0, -15.964, -15.964],
    });
    void frontControls.start({
      rotate: [0, 0, -20, -20],
      x: [0, 0, -2.854, -2.854],
      y: [0, 0, -7.844, -7.844],
    });
  }, [backControls, frontControls, paused, reduceMotion]);

  return (
    <div className="glass-motion" data-node-id="415:56659" aria-hidden="true">
      <motion.div
        className="glass-motion__back"
        data-node-id="415:56666"
        data-motion-keys="rotate,x,y"
        data-motion-wrapper-for="415:56666"
        initial={{ rotate: 0, x: 0, y: 0 }}
        animate={backControls}
        transition={{
          rotate: {
            duration: 5,
            times: [0, 0.2, 0.4826, 1],
            ease: ["linear", figmaSpring, "linear"],
            repeat: Infinity,
              repeatType: "mirror",
          },
          x: {
            duration: 5,
            times: [0, 0.2527, 0.4826, 1],
            ease: ["linear", figmaSpring, "linear"],
            repeat: Infinity,
              repeatType: "mirror",
          },
          y: {
            duration: 5,
            times: [0, 0.2527, 0.4826, 1],
            ease: ["linear", figmaSpring, "linear"],
            repeat: Infinity,
              repeatType: "mirror",
          },
        }}
      >
        <div className="glass-motion__back-static">
          <div className="glass-motion__back-card" data-name="后">
            <div className="glass-motion__back-content" data-node-id="415:56668">
              <img src={assetUrl("assets/figma-icons/glass-motion-56659-back-v2@2x.png")} alt="" />
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div
        className="glass-motion__front"
        data-node-id="415:56675"
        data-motion-keys="rotate,x,y"
        data-motion-wrapper-for="415:56675"
        initial={{ rotate: 0, x: 0, y: 0 }}
        animate={frontControls}
        transition={{
          rotate: {
            duration: 5,
            times: [0, 0.2, 0.4826, 1],
            ease: ["linear", figmaSpring, "linear"],
            repeat: Infinity,
              repeatType: "mirror",
          },
          x: {
            duration: 5,
            times: [0, 0.2542, 0.4826, 1],
            ease: ["linear", figmaSpring, "linear"],
            repeat: Infinity,
              repeatType: "mirror",
          },
          y: {
            duration: 5,
            times: [0, 0.2542, 0.4826, 1],
            ease: ["linear", figmaSpring, "linear"],
            repeat: Infinity,
              repeatType: "mirror",
          },
        }}
      >
        <div className="glass-motion__front-static">
          <img
            className="glass-motion__front-card glass-motion__front-card--base"
            data-node-id="415:56676"
            data-name="前"
            src={assetUrl("assets/figma-icons/glass-motion-56659-front-base@2x.png")}
            alt=""
          />
        </div>
      </motion.div>
    </div>
  );
}
