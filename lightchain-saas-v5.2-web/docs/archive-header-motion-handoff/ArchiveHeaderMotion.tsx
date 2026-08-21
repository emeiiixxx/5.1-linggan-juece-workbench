import { useEffect, useLayoutEffect, useRef, type PointerEvent as ReactPointerEvent } from "react";
import { useReducedMotion } from "motion/react";
import { gsap } from "gsap";

const images = {
  dark: [
    "archive-header-product-planning.png",
    "archive-header-client-proposal-dark.png",
    "archive-header-fashion-design.png",
    "archive-header-pattern-design.png",
  ],
  light: [
    "archive-header-product-planning-light.png",
    "archive-header-client-proposal-light.png",
    "archive-header-fashion-design-light.png",
    "archive-header-pattern-design-light.png",
  ],
} as const;

const labels = [
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

type ArchiveHeaderMotionProps = {
  theme: "dark" | "light";
  activeTab: number;
  assetBaseUrl: string;
  translate?: (value: string) => string;
};

export function ArchiveHeaderMotion({
  theme,
  activeTab,
  assetBaseUrl,
  translate = (value) => value,
}: ArchiveHeaderMotionProps) {
  const reduceMotion = useReducedMotion();
  const rootRef = useRef<HTMLDivElement>(null);
  const topRepelRef = useRef<HTMLDivElement>(null);
  const topFloatRef = useRef<HTMLDivElement>(null);
  const bottomRepelRef = useRef<HTMLDivElement>(null);
  const bottomFloatRef = useRef<HTMLDivElement>(null);
  const quickSettersRef = useRef<QuickSetters | null>(null);
  const labelCentersRef = useRef<LabelCenters | null>(null);
  const activeLabels = labels[activeTab] ?? labels[0];
  const activeImage = images[theme][activeTab] ?? images[theme][0];
  const assetUrl = (fileName: string) => `${assetBaseUrl.replace(/\/$/, "")}/${fileName}`;

  useEffect(() => {
    Object.values(images).flat().forEach((fileName) => {
      const image = new Image();
      image.src = assetUrl(fileName);
    });
  }, [assetBaseUrl]);

  useLayoutEffect(() => {
    const topRepel = topRepelRef.current;
    const topFloat = topFloatRef.current;
    const bottomRepel = bottomRepelRef.current;
    const bottomFloat = bottomFloatRef.current;
    if (!rootRef.current || !topRepel || !topFloat || !bottomRepel || !bottomFloat) return;

    const context = gsap.context(() => {
      gsap.set([topRepel, topFloat, bottomRepel, bottomFloat], { x: 0, y: 0, force3D: true });
      if (reduceMotion) return;

      gsap.to(topFloat, { y: -6, duration: 3.9, ease: "sine.inOut", repeat: -1, yoyo: true });
      gsap.to(bottomFloat, { y: 6, duration: 4.4, delay: 0.7, ease: "sine.inOut", repeat: -1, yoyo: true });

      quickSettersRef.current = {
        topX: gsap.quickTo(topRepel, "x", { duration: 0.46, ease: "power3.out" }),
        topY: gsap.quickTo(topRepel, "y", { duration: 0.46, ease: "power3.out" }),
        bottomX: gsap.quickTo(bottomRepel, "x", { duration: 0.5, ease: "power3.out" }),
        bottomY: gsap.quickTo(bottomRepel, "y", { duration: 0.5, ease: "power3.out" }),
      };
    }, rootRef);

    return () => {
      quickSettersRef.current = null;
      context.revert();
    };
  }, [reduceMotion]);

  const captureCenters = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "mouse") return;
    const top = topRepelRef.current?.getBoundingClientRect();
    const bottom = bottomRepelRef.current?.getBoundingClientRect();
    if (!top || !bottom) return;
    labelCentersRef.current = {
      top: { x: top.left + top.width / 2, y: top.top + top.height / 2 },
      bottom: { x: bottom.left + bottom.width / 2, y: bottom.top + bottom.height / 2 },
    };
  };

  const repel = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "mouse" || !labelCentersRef.current || !quickSettersRef.current) return;
    const vector = (center: { x: number; y: number }, fallbackY: number) => {
      const dx = center.x - event.clientX;
      const dy = center.y - event.clientY;
      const distance = Math.hypot(dx, dy);
      const magnitude = 18 * Math.max(0, 1 - distance / 96);
      if (distance < 0.001) return { x: 0, y: fallbackY * magnitude };
      return { x: (dx / distance) * magnitude, y: (dy / distance) * magnitude };
    };
    const top = vector(labelCentersRef.current.top, -1);
    const bottom = vector(labelCentersRef.current.bottom, 1);
    quickSettersRef.current.topX(top.x);
    quickSettersRef.current.topY(top.y);
    quickSettersRef.current.bottomX(bottom.x);
    quickSettersRef.current.bottomY(bottom.y);
  };

  const settle = () => {
    labelCentersRef.current = null;
    quickSettersRef.current?.topX(0);
    quickSettersRef.current?.topY(0);
    quickSettersRef.current?.bottomX(0);
    quickSettersRef.current?.bottomY(0);
  };

  return (
    <div ref={rootRef} className={`archive-header-motion archive-header-motion--${theme}`} aria-hidden="true">
      <img className="archive-header-motion__image" src={assetUrl(activeImage)} alt="" />
      <div className="archive-header-motion__sensor" onPointerEnter={captureCenters} onPointerMove={repel} onPointerLeave={settle} />
      <div className="archive-header-motion__tag archive-header-motion__tag--top">
        <div ref={topRepelRef} className="archive-header-motion__tag-repel">
          <div ref={topFloatRef} className="archive-header-motion__tag-surface"><span>{translate(activeLabels.top)}</span></div>
        </div>
      </div>
      <div className="archive-header-motion__tag archive-header-motion__tag--bottom">
        <div ref={bottomRepelRef} className="archive-header-motion__tag-repel">
          <div ref={bottomFloatRef} className="archive-header-motion__tag-surface"><span>{translate(activeLabels.bottom)}</span></div>
        </div>
      </div>
    </div>
  );
}
