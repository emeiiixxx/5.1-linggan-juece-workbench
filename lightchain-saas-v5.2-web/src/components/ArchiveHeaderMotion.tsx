import { useEffect, useRef, type PointerEvent as ReactPointerEvent } from "react";
import { useReducedMotion } from "motion/react";
import { useI18n } from "../i18n";
import { gsap, useGSAP } from "../motion/gsap";
import { assetUrl } from "../utils/assets";

const archiveHeaderImages = {
  dark: [
    "assets/figma-confirmed/archive-header-product-planning.png",
    "assets/figma-confirmed/archive-header-client-proposal-dark.png",
    "assets/figma-confirmed/archive-header-fashion-design.png",
    "assets/figma-confirmed/archive-header-pattern-design.png",
  ],
  light: [
    "assets/figma-confirmed/archive-header-product-planning-light.png",
    "assets/figma-confirmed/archive-header-client-proposal-light.png",
    "assets/figma-confirmed/archive-header-fashion-design-light.png",
    "assets/figma-confirmed/archive-header-pattern-design-light.png",
  ],
} as const;

const archiveHeaderLabels = [
  { top: "精准选品", bottom: "市场洞察" },
  { top: "高效沟通", bottom: "创意提案" },
  { top: "个性定制", bottom: "潮流设计" },
  { top: "视觉吸引", bottom: "原创图案" },
] as const;

type QuickSetters = {
  topX: (value: number) => void;
  topY: (value: number) => void;
  bottomX: (value: number) => void;
  bottomY: (value: number) => void;
};

type LabelCenters = {
  top: { x: number; y: number };
  bottom: { x: number; y: number };
};

export function ArchiveHeaderMotion({ theme, activeTab }: { theme: "dark" | "light"; activeTab: number }) {
  const { t } = useI18n();
  const reduceMotion = useReducedMotion();
  const rootRef = useRef<HTMLDivElement>(null);
  const topRepelRef = useRef<HTMLDivElement>(null);
  const topFloatRef = useRef<HTMLDivElement>(null);
  const bottomRepelRef = useRef<HTMLDivElement>(null);
  const bottomFloatRef = useRef<HTMLDivElement>(null);
  const quickSettersRef = useRef<QuickSetters | null>(null);
  const labelCentersRef = useRef<LabelCenters | null>(null);
  const labels = archiveHeaderLabels[activeTab] ?? archiveHeaderLabels[0];
  const themeImages = archiveHeaderImages[theme];
  const activeImage = themeImages[activeTab] ?? themeImages[0];

  useEffect(() => {
    Object.values(archiveHeaderImages).flat().forEach((image) => {
      const preloadImage = new Image();
      preloadImage.src = assetUrl(image);
    });
  }, []);

  useGSAP(() => {
    const topRepel = topRepelRef.current;
    const topFloat = topFloatRef.current;
    const bottomRepel = bottomRepelRef.current;
    const bottomFloat = bottomFloatRef.current;
    if (!topRepel || !topFloat || !bottomRepel || !bottomFloat) return;

    gsap.set([topRepel, topFloat, bottomRepel, bottomFloat], {
      x: 0,
      y: 0,
      force3D: true,
    });

    if (reduceMotion) {
      quickSettersRef.current = null;
      return;
    }

    gsap.to(topFloat, {
      x: 0,
      y: -6,
      duration: 3.3,
      ease: "sine.inOut",
      repeat: -1,
      yoyo: true,
    });
    gsap.to(bottomFloat, {
      x: 0,
      y: 6,
      duration: 3.7,
      delay: 0.5,
      ease: "sine.inOut",
      repeat: -1,
      yoyo: true,
    });

    quickSettersRef.current = {
      topX: gsap.quickTo(topRepel, "x", { duration: 0.46, ease: "power3.out" }),
      topY: gsap.quickTo(topRepel, "y", { duration: 0.46, ease: "power3.out" }),
      bottomX: gsap.quickTo(bottomRepel, "x", { duration: 0.5, ease: "power3.out" }),
      bottomY: gsap.quickTo(bottomRepel, "y", { duration: 0.5, ease: "power3.out" }),
    };

    return () => {
      quickSettersRef.current = null;
    };
  }, { scope: rootRef, dependencies: [reduceMotion], revertOnUpdate: true });

  const captureLabelCenters = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "mouse") return;
    const top = topRepelRef.current?.getBoundingClientRect();
    const bottom = bottomRepelRef.current?.getBoundingClientRect();
    if (!top || !bottom) return;
    labelCentersRef.current = {
      top: { x: top.left + top.width / 2, y: top.top + top.height / 2 },
      bottom: { x: bottom.left + bottom.width / 2, y: bottom.top + bottom.height / 2 },
    };
  };

  const repelLabels = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "mouse") return;
    const centers = labelCentersRef.current;
    const setters = quickSettersRef.current;
    if (!centers || !setters) return;
    const repelVector = (center: { x: number; y: number }, fallbackY: number) => {
      const dx = center.x - event.clientX;
      const dy = center.y - event.clientY;
      const distance = Math.hypot(dx, dy);
      const magnitude = 18 * Math.max(0, 1 - distance / 96);

      if (distance < 0.001) {
        return { x: 0, y: fallbackY * magnitude };
      }

      return {
        x: (dx / distance) * magnitude,
        y: (dy / distance) * magnitude,
      };
    };

    const topOffset = repelVector(centers.top, -1);
    const bottomOffset = repelVector(centers.bottom, 1);

    setters.topX(topOffset.x);
    setters.topY(topOffset.y);
    setters.bottomX(bottomOffset.x);
    setters.bottomY(bottomOffset.y);
  };

  const settleLabels = () => {
    labelCentersRef.current = null;
    quickSettersRef.current?.topX(0);
    quickSettersRef.current?.topY(0);
    quickSettersRef.current?.bottomX(0);
    quickSettersRef.current?.bottomY(0);
  };

  return (
    <div
      ref={rootRef}
      className={`archive-header-motion archive-header-motion--${theme}`}
      aria-hidden="true"
    >
      <img
        className="archive-header-motion__image"
        src={assetUrl(activeImage)}
        alt=""
      />
      <div
        className="archive-header-motion__sensor"
        onPointerEnter={captureLabelCenters}
        onPointerMove={repelLabels}
        onPointerLeave={settleLabels}
      />
      <div
        className="archive-header-motion__tag archive-header-motion__tag--top"
      >
        <div ref={topRepelRef} className="archive-header-motion__tag-repel">
          <div ref={topFloatRef} className="archive-header-motion__tag-surface">
            <span>{t(labels.top)}</span>
          </div>
        </div>
      </div>
      <div
        className="archive-header-motion__tag archive-header-motion__tag--bottom"
      >
        <div ref={bottomRepelRef} className="archive-header-motion__tag-repel">
          <div ref={bottomFloatRef} className="archive-header-motion__tag-surface">
            <span>{t(labels.bottom)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
