import { useEffect, useRef, useState, type HTMLAttributes, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion, type HTMLMotionProps } from "motion/react";
import { assetUrl } from "../utils/assets";
import { gsap, gsapMotion, useGSAP } from "../motion/gsap";
import { FigmaIcon } from "./FigmaIcon";
import { IconControl } from "./IconControl";
import { Button, OutlineToggleButton, SuggestionButton } from "./Button";

export type ConversationStepStatus = "complete" | "loading" | "pending";

const revealEase = [0.22, 1, 0.36, 1] as const;

type MessageMetaPosition = { left: number; top: number; side: "assistant" | "user" };
type MessageFeedback = {
  reaction: "like" | "dislike";
  reasons?: string[];
  detail?: string;
};

const feedbackReasons = ["不正确 / 不完整", "没有遵循我的指示", "速度慢", "偏题 / 超出范围", "其他"];

function getMessageMetaPosition(message: HTMLElement): MessageMetaPosition {
  const isUserMessage = message.classList.contains("conversation-message--user");
  const anchor = isUserMessage
    ? message.querySelector<HTMLElement>(".conversation-user-bubble") ?? message
    : message;
  const rect = anchor.getBoundingClientRect();
  const showBelow = rect.bottom + 36 <= window.innerHeight;
  return {
    left: isUserMessage ? rect.right : rect.left,
    top: showBelow ? rect.bottom + 4 : rect.top - 32,
    side: isUserMessage ? "user" : "assistant",
  };
}

export function ConversationFeed({ className = "", children, ...props }: HTMLAttributes<HTMLDivElement>) {
  const reduceMotion = useReducedMotion();
  const hoveredMessageRef = useRef<HTMLElement | null>(null);
  const hideTimerRef = useRef<number | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  const feedbackByMessageRef = useRef(new WeakMap<HTMLElement, MessageFeedback>());
  const [metaPosition, setMetaPosition] = useState<MessageMetaPosition | null>(null);
  const [, setFeedbackRevision] = useState(0);
  const [feedbackMessage, setFeedbackMessage] = useState<HTMLElement | null>(null);
  const [selectedReasons, setSelectedReasons] = useState<string[]>([]);
  const [feedbackDetail, setFeedbackDetail] = useState("");
  const [toast, setToast] = useState("");

  const keepMetaOpen = () => {
    if (hideTimerRef.current === null) return;
    window.clearTimeout(hideTimerRef.current);
    hideTimerRef.current = null;
  };

  const scheduleMetaHide = () => {
    if (hideTimerRef.current !== null) return;
    hideTimerRef.current = window.setTimeout(() => {
      hideTimerRef.current = null;
      hoveredMessageRef.current = null;
      setMetaPosition(null);
    }, 220);
  };

  const showMessageMeta = (event: ReactPointerEvent<HTMLDivElement>) => {
    const eventTarget = event.target as HTMLElement;
    const message = eventTarget.closest<HTMLElement>('[data-message-actions="true"]')
      ?? eventTarget.closest<HTMLElement>(".conversation-message--user");
    if (!message) {
      if (hoveredMessageRef.current) scheduleMetaHide();
      return;
    }
    keepMetaOpen();
    if (hoveredMessageRef.current === message && metaPosition) return;
    hoveredMessageRef.current = message;
    setMetaPosition(getMessageMetaPosition(message));
  };

  const copyHoveredMessage = () => {
    const text = hoveredMessageRef.current?.innerText.trim();
    if (!text) return;
    const showCopiedToast = () => {
      setToast("复制成功");
      if (toastTimerRef.current !== null) window.clearTimeout(toastTimerRef.current);
      toastTimerRef.current = window.setTimeout(() => {
        toastTimerRef.current = null;
        setToast("");
      }, 2000);
    };
    const copyOperation = navigator.clipboard?.writeText(text);
    if (copyOperation) void copyOperation.then(showCopiedToast).catch(showCopiedToast);
    else showCopiedToast();
  };

  const likeHoveredMessage = () => {
    const message = hoveredMessageRef.current;
    if (!message) return;
    const current = feedbackByMessageRef.current.get(message);
    if (current?.reaction === "like") feedbackByMessageRef.current.delete(message);
    else feedbackByMessageRef.current.set(message, { reaction: "like" });
    setFeedbackRevision((revision) => revision + 1);
  };

  const openFeedbackDialog = () => {
    const message = hoveredMessageRef.current;
    if (!message) return;
    setFeedbackMessage(message);
    setSelectedReasons([]);
    setFeedbackDetail("");
  };

  const closeFeedbackDialog = () => {
    setFeedbackMessage(null);
    setSelectedReasons([]);
    setFeedbackDetail("");
  };

  const toggleFeedbackReason = (reason: string) => {
    setSelectedReasons((current) => current.includes(reason)
      ? current.filter((item) => item !== reason)
      : [...current, reason]);
  };

  const submitFeedback = () => {
    if (!feedbackMessage) return;
    feedbackByMessageRef.current.set(feedbackMessage, {
      reaction: "dislike",
      reasons: selectedReasons,
      detail: feedbackDetail.trim(),
    });
    setFeedbackRevision((revision) => revision + 1);
    closeFeedbackDialog();
  };

  useEffect(() => {
    const reposition = () => {
      const message = hoveredMessageRef.current;
      if (message) setMetaPosition(getMessageMetaPosition(message));
    };
    const hideWhileScrolling = () => {
      hoveredMessageRef.current = null;
      setMetaPosition(null);
    };
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", hideWhileScrolling, true);
    return () => {
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", hideWhileScrolling, true);
      if (hideTimerRef.current !== null) window.clearTimeout(hideTimerRef.current);
      if (toastTimerRef.current !== null) window.clearTimeout(toastTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!feedbackMessage) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeFeedbackDialog();
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [feedbackMessage]);

  const currentFeedback = hoveredMessageRef.current
    ? feedbackByMessageRef.current.get(hoveredMessageRef.current)
    : undefined;

  return (
    <>
      <div className={`conversation-feed ${className}`.trim()} onPointerOver={showMessageMeta} onPointerLeave={scheduleMetaHide} {...props}>
        {children}
      </div>
      {metaPosition && typeof document !== "undefined" && createPortal(
        <div
          className={`conversation-message-meta conversation-message-meta--floating is-${metaPosition.side}`}
          style={{ left: metaPosition.left, top: metaPosition.top }}
          onPointerEnter={keepMetaOpen}
          onPointerLeave={scheduleMetaHide}
        >
          {metaPosition.side === "user" ? (
            <>
              <time>10:24</time>
              <div><IconControl label="复制消息" variant="bare" size="xsmall" onClick={copyHoveredMessage}><FigmaIcon name="copy" size={16} /></IconControl></div>
            </>
          ) : (
            <>
              <div>
                <IconControl label="复制消息" variant="bare" size="xsmall" onClick={copyHoveredMessage}><FigmaIcon name="copy" size={16} /></IconControl>
                <IconControl label="赞同消息" variant="bare" size="xsmall" aria-pressed={currentFeedback?.reaction === "like"} onClick={likeHoveredMessage}>
                  <AnimatePresence initial={false} mode="wait">
                    <motion.span className="conversation-feedback-icon" key={currentFeedback?.reaction === "like" ? "like-filled" : "like"} initial={reduceMotion ? false : { opacity: 0, scale: 0.72, rotate: -8 }} animate={{ opacity: 1, scale: 1, rotate: 0 }} exit={reduceMotion ? undefined : { opacity: 0, scale: 0.84 }} transition={{ duration: reduceMotion ? 0 : 0.2, ease: revealEase }}>
                      <FigmaIcon name={currentFeedback?.reaction === "like" ? "like-filled" : "like"} size={16} />
                    </motion.span>
                  </AnimatePresence>
                </IconControl>
                <IconControl label="不赞同消息" variant="bare" size="xsmall" aria-pressed={currentFeedback?.reaction === "dislike"} onClick={openFeedbackDialog}>
                  <AnimatePresence initial={false} mode="wait">
                    <motion.span className="conversation-feedback-icon" key={currentFeedback?.reaction === "dislike" ? "dislike-filled" : "dislike"} initial={reduceMotion ? false : { opacity: 0, scale: 0.72, rotate: 8 }} animate={{ opacity: 1, scale: 1, rotate: 0 }} exit={reduceMotion ? undefined : { opacity: 0, scale: 0.84 }} transition={{ duration: reduceMotion ? 0 : 0.2, ease: revealEase }}>
                      <FigmaIcon name={currentFeedback?.reaction === "dislike" ? "dislike-filled" : "dislike"} size={16} />
                    </motion.span>
                  </AnimatePresence>
                </IconControl>
              </div>
              <time>10:24</time>
            </>
          )}
        </div>,
        document.body,
      )}
      {typeof document !== "undefined" && createPortal(
        <AnimatePresence>
          {toast ? (
            <motion.div className="conversation-copy-toast" role="status" initial={reduceMotion ? false : { opacity: 0, x: "-50%", y: -12 }} animate={{ opacity: 1, x: "-50%", y: 0 }} exit={reduceMotion ? undefined : { opacity: 0, x: "-50%", y: -8 }} transition={{ duration: reduceMotion ? 0 : 0.2, ease: revealEase }}>
              {toast}
            </motion.div>
          ) : null}
        </AnimatePresence>,
        document.body,
      )}
      {feedbackMessage && typeof document !== "undefined" && createPortal(
        <motion.div className="conversation-feedback-backdrop" role="presentation" initial={reduceMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: reduceMotion ? 0 : 0.2 }} onPointerDown={(event) => { if (event.target === event.currentTarget) closeFeedbackDialog(); }}>
          <motion.section className="conversation-feedback-dialog" role="dialog" aria-modal="true" aria-labelledby="conversation-feedback-title" initial={reduceMotion ? false : { opacity: 0, y: 10, scale: 0.985 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: reduceMotion ? 0 : 0.2, ease: revealEase }}>
            <header>
              <h2 id="conversation-feedback-title">帮助改进</h2>
              <IconControl label="关闭" variant="bare" size="medium" autoFocus onClick={closeFeedbackDialog}><FigmaIcon name="close" size={20} /></IconControl>
            </header>
            <div className="conversation-feedback-dialog__body">
              <div className="conversation-feedback-reasons" role="group" aria-label="选择需要改进的原因，支持多选">
                {feedbackReasons.map((reason) => {
                  const selected = selectedReasons.includes(reason);
                  return <OutlineToggleButton appearance="base" selected={selected} onClick={() => toggleFeedbackReason(reason)} key={reason}>{reason}</OutlineToggleButton>;
                })}
              </div>
              <label className="conversation-feedback-detail">
                <textarea value={feedbackDetail} maxLength={1000} placeholder="填写详情（选填）" onChange={(event) => setFeedbackDetail(event.target.value)} />
                <span>{feedbackDetail.length}/1000</span>
              </label>
            </div>
            <footer>
              <Button variant="secondary" onClick={closeFeedbackDialog}>取消</Button>
              <Button variant="primary" onClick={submitFeedback}>提交</Button>
            </footer>
          </motion.section>
        </motion.div>,
        document.body,
      )}
    </>
  );
}

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

export function ConversationFormTitle({
  title,
  helper,
  status,
  statusLabel,
}: {
  title: string;
  helper?: string;
  status?: "pending" | "confirmed";
  statusLabel?: string;
}) {
  return (
    <header className="conversation-form-title">
      <div className="conversation-form-title__row">
        <div className="conversation-form-title__heading">
          <span><img src={assetUrl("assets/figma-icons/apparel-design.svg")} alt="" /></span>
          <strong>{title}</strong>
        </div>
        {status ? <span className={`conversation-form-status is-${status}`}>{statusLabel}</span> : null}
      </div>
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

export function TaskArtifactRow({
  kind,
  children,
}: {
  kind: "file" | "image";
  children: ReactNode;
}) {
  return (
    <div className="task-detail-row task-detail-row--artifact">
      <FigmaIcon name={kind === "file" ? "add-file" : "image-generation"} size={16} />
      <span>{children}</span>
    </div>
  );
}

export function ConversationTaskCompletion({
  message,
  suggestions,
  onSuggestion,
  children,
}: {
  message: ReactNode;
  suggestions: readonly string[];
  onSuggestion?: (suggestion: string) => void;
  children?: ReactNode;
}) {
  return (
    <div className="conversation-task-completion">
      <p>{message}</p>
      {children}
      {suggestions.length ? (
        <div className="conversation-suggestion-list" aria-label="推荐后续任务">
          {suggestions.map((suggestion) => (
            <SuggestionButton onClick={onSuggestion ? () => onSuggestion(suggestion) : undefined} key={suggestion}>
              {suggestion}
            </SuggestionButton>
          ))}
        </div>
      ) : null}
    </div>
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
