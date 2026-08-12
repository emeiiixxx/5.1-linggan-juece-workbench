import { useRef, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion, type HTMLMotionProps } from "motion/react";
import { assetUrl } from "../utils/assets";
import { gsap, gsapMotion, useGSAP } from "../motion/gsap";
import { FigmaIcon } from "./FigmaIcon";

export type ConversationStepStatus = "complete" | "loading" | "pending";

const revealEase = [0.22, 1, 0.36, 1] as const;

export function ConversationStatusIcon({ status }: { status: ConversationStepStatus }) {
  if (status === "complete") return <span className="conversation-status-icon is-complete" aria-label="已完成"><FigmaIcon name="check" size={16} /></span>;
  if (status === "loading") return <span className="conversation-status-icon is-loading" aria-label="进行中"><img className="conversation-loading-asset" src={assetUrl("assets/figma-icons/demand-loading.svg")} alt="" /></span>;
  return <span className="conversation-status-icon is-pending" aria-label="待处理" />;
}

export function AnalysisStepIcon({ complete, delay = 0 }: { complete: boolean; delay?: number }) {
  const reduceMotion = useReducedMotion();
  return (
    <span className="conversation-step-state-icon" aria-hidden="true">
      <AnimatePresence initial={false} mode="wait">
        <motion.span
          className={complete ? "conversation-step-complete-icon" : ""}
          key={complete ? "complete" : "searching"}
          initial={reduceMotion ? false : { opacity: 0, scale: 0.65 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={reduceMotion ? undefined : { opacity: 0, scale: 0.72 }}
          transition={{ duration: reduceMotion ? 0 : 0.18, delay: reduceMotion ? 0 : delay, ease: revealEase }}
        >
          <FigmaIcon name={complete ? "dot" : "search"} size={16} />
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

export function TaskDisclosure({
  title,
  expanded,
  complete,
  controlsId,
  onToggle,
  children,
}: {
  title: string;
  expanded: boolean;
  complete: boolean;
  controlsId: string;
  onToggle: () => void;
  children: ReactNode;
}) {
  const reduceMotion = useReducedMotion();
  const rootRef = useRef<HTMLDivElement>(null);
  const detailsRef = useRef<HTMLDivElement>(null);
  const disclosureRef = useRef<HTMLSpanElement>(null);
  const initializedRef = useRef(false);

  useGSAP(() => {
    const details = detailsRef.current;
    const disclosure = disclosureRef.current;
    if (!details || !disclosure) return;
    gsap.killTweensOf([details, disclosure]);

    if (reduceMotion || !initializedRef.current) {
      gsap.set(details, { height: expanded ? "auto" : 0, autoAlpha: expanded ? 1 : 0 });
      gsap.set(disclosure, { rotation: expanded ? 90 : 0 });
      initializedRef.current = true;
      return;
    }

    gsap.to(disclosure, {
      rotation: expanded ? 90 : 0,
      duration: gsapMotion.fast,
      ease: gsapMotion.ease,
      overwrite: "auto",
    });

    if (expanded) {
      const startHeight = details.getBoundingClientRect().height;
      gsap.set(details, { height: "auto", autoAlpha: 1 });
      const targetHeight = details.scrollHeight;
      gsap.fromTo(
        details,
        { height: startHeight, autoAlpha: startHeight > 0 ? 1 : 0 },
        {
          height: targetHeight,
          autoAlpha: 1,
          duration: gsapMotion.duration,
          ease: gsapMotion.ease,
          overwrite: "auto",
          onComplete: () => { gsap.set(details, { height: "auto", clearProps: "visibility" }); },
        },
      );
      return;
    }

    gsap.to(details, {
      height: 0,
      autoAlpha: 0,
      duration: gsapMotion.duration,
      ease: gsapMotion.easeInOut,
      overwrite: "auto",
    });
  }, { scope: rootRef, dependencies: [expanded, reduceMotion] });

  return (
    <div className="conversation-analysis-task" ref={rootRef}>
      <button type="button" className="conversation-analysis-trigger" aria-expanded={expanded} aria-controls={controlsId} onClick={onToggle}>
        <AnimatePresence initial={false} mode="wait">
          {complete ? (
            <motion.span className="conversation-analysis-complete-icon" key="complete" initial={reduceMotion ? false : { opacity: 0, scale: 0.62, rotate: -18 }} animate={{ opacity: 1, scale: 1, rotate: 0 }} transition={{ duration: reduceMotion ? 0 : 0.24, ease: revealEase }}>
              <FigmaIcon name="check" size={20} />
            </motion.span>
          ) : (
            <motion.span className="conversation-analysis-loading" key="loading" initial={reduceMotion ? false : { opacity: 1, scale: 1 }} animate={{ opacity: 1, scale: 1 }} exit={reduceMotion ? undefined : { opacity: 0, scale: 0.68 }} transition={{ duration: reduceMotion ? 0 : 0.16, ease: revealEase }}>
              <img className="conversation-analysis-spinner" src={assetUrl("assets/figma-icons/demand-loading.svg")} alt="" />
            </motion.span>
          )}
        </AnimatePresence>
        <span className={`conversation-analysis-title ${complete ? "" : "is-loading"}`}>{title}</span>
        <span className="conversation-analysis-disclosure" ref={disclosureRef}>
          <FigmaIcon name="chevron-right" size={16} />
        </span>
      </button>
      <div id={controlsId} className="conversation-analysis-details" ref={detailsRef} aria-hidden={!expanded} style={{ pointerEvents: expanded ? "auto" : "none" }}>
        {children}
      </div>
    </div>
  );
}

export function ConversationFormTitle({ title, helper }: { title: string; helper?: string }) {
  return (
    <header className="conversation-form-title">
      <span><img src={assetUrl("assets/figma-icons/apparel-design.svg")} alt="" /></span>
      <strong>{title}</strong>
      {helper ? <small>{helper}</small> : null}
    </header>
  );
}

export function ConversationFileCard({
  icon,
  name,
  description,
  children,
}: {
  icon: "html" | "excel";
  name: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="trend-file-card">
      <span className="trend-file-card__icon" aria-hidden="true"><span /><img src={assetUrl(`assets/figma-icons/file-${icon}.svg`)} alt="" /></span>
      <div className="trend-file-card__info"><strong>{name}</strong><span>{description}</span></div>
      <div className="trend-file-card__actions">{children}</div>
    </section>
  );
}

type ConversationUserMessageProps = Omit<HTMLMotionProps<"article">, "children"> & {
  children: ReactNode;
  entrance?: boolean;
};

export function ConversationUserMessage({
  children,
  className = "",
  entrance = false,
  ...props
}: ConversationUserMessageProps) {
  const entranceMotion = entrance
    ? { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 } }
    : {};

  return (
    <motion.article
      className={`conversation-message conversation-message--user ${className}`}
      {...entranceMotion}
      {...props}
    >
      <div className="conversation-user-bubble">{children}</div>
      <img className="conversation-avatar" src={assetUrl("assets/figma-icons/avatar.png")} alt="用户头像" />
    </motion.article>
  );
}
