import { useRef, type DependencyList, type RefObject } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";

gsap.registerPlugin(useGSAP);

export const gsapMotion = {
  ease: "power3.out",
  easeInOut: "power3.inOut",
  duration: 0.42,
  fast: 0.22,
  stagger: 0.055,
} as const;

const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function useGsapEntrance<T extends HTMLElement>({
  delay = 0,
  y = 10,
  scale = 0.992,
  dependencies = [],
}: {
  delay?: number;
  y?: number;
  scale?: number;
  dependencies?: DependencyList;
} = {}): RefObject<T | null> {
  const ref = useRef<T>(null);

  useGSAP(() => {
    const target = ref.current;
    if (!target) return;
    if (prefersReducedMotion()) {
      gsap.set(target, { clearProps: "all" });
      return;
    }
    gsap.fromTo(
      target,
      { autoAlpha: 0, y, scale, willChange: "transform,opacity" },
      {
        autoAlpha: 1,
        y: 0,
        scale: 1,
        duration: gsapMotion.duration,
        delay,
        ease: gsapMotion.ease,
        clearProps: "opacity,visibility,transform,willChange",
      },
    );
  }, { scope: ref, dependencies: [...dependencies], revertOnUpdate: true });

  return ref;
}

export function useGsapStaggerEntrance<T extends HTMLElement>(
  selector: string,
  { delay = 0, y = 10, dependencies = [] }: { delay?: number; y?: number; dependencies?: DependencyList } = {},
): RefObject<T | null> {
  const ref = useRef<T>(null);

  useGSAP(() => {
    if (!ref.current || prefersReducedMotion()) return;
    gsap.fromTo(
      selector,
      { autoAlpha: 0, y, willChange: "transform,opacity" },
      {
        autoAlpha: 1,
        y: 0,
        duration: gsapMotion.duration,
        delay,
        stagger: gsapMotion.stagger,
        ease: gsapMotion.ease,
        clearProps: "opacity,visibility,transform,willChange",
      },
    );
  }, { scope: ref, dependencies: [...dependencies], revertOnUpdate: true });

  return ref;
}

export { gsap, useGSAP, prefersReducedMotion };
