import { createContext, useContext, useEffect, useRef, useState, type HTMLAttributes, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion, type HTMLMotionProps } from "motion/react";
import { assetUrl } from "../utils/assets";
import { gsap, gsapMotion, useGSAP } from "../motion/gsap";
import { FigmaIcon } from "./FigmaIcon";
import { IconControl } from "./IconControl";
import { Button, OutlineToggleButton, SuggestionButton } from "./Button";
import { useI18n } from "../i18n";
import { useModalFocus } from "../hooks/useModalFocus";
import { Toast } from "./Toast";
import { SelectionCard } from "./SelectionCard";

export type ConversationStepStatus = "complete" | "loading" | "pending";

const revealEase = [0.22, 1, 0.36, 1] as const;
const conversationMetaClaimEvent = "lightchain:conversation-meta-claim";
const TaskDisclosureCompleteContext = createContext<boolean | null>(null);

type MessageMetaPosition = { left: number; top: number; side: "assistant" | "user" };
type MessageFeedback = {
  reaction: "like" | "dislike";
  reasons?: string[];
  detail?: string;
};

const feedbackReasons = ["不正确 / 不完整", "没有遵循我的指示", "速度慢", "偏题 / 超出范围", "其他"];
const conversationNonTextRegionSelector = [
  '[data-message-meta="disabled"]',
  '[data-copy-exclude="true"]',
  "form",
  ".research-scope-form",
  ".plan-choice-form",
  ".new-product-direction-form",
  ".new-product-results-form",
  ".conversation-candidate-form",
  ".customer-ai-results-form",
  ".media-selection-form",
  ".image-selection",
  ".masonry-image-selection",
  ".plan-generation-image-grid",
  ".plan-reference-grid",
  ".conversation-quick-actions",
  ".new-product-quick-replies",
].join(", ");

function getCopyableMessageText(message: HTMLElement) {
  const copy = message.cloneNode(true) as HTMLElement;
  copy.querySelectorAll(`${conversationNonTextRegionSelector}, button, [role="button"], input, textarea, select, img, picture, video, canvas`).forEach((element) => element.remove());
  copy.style.cssText = "position:fixed;left:-100000px;top:0;width:" + message.getBoundingClientRect().width + "px;pointer-events:none;";
  document.body.appendChild(copy);
  const text = copy.innerText.trim();
  copy.remove();
  return text;
}

async function writeClipboardText(text: string) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through for browsers that expose Clipboard API but deny the write.
    }
  }
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.cssText = "position:fixed;left:-100000px;top:0;opacity:0;pointer-events:none;";
  document.body.appendChild(textarea);
  textarea.select();
  textarea.setSelectionRange(0, textarea.value.length);
  let copied = false;
  try {
    copied = document.execCommand("copy");
  } catch {
    copied = false;
  }
  textarea.remove();
  return copied;
}

function getMessageMetaPosition(message: HTMLElement): MessageMetaPosition {
  const isUserMessage = message.classList.contains("conversation-message--user");
  const anchor = isUserMessage
    ? message.querySelector<HTMLElement>(".conversation-user-bubble") ?? message
    : message;
  const rect = anchor.getBoundingClientRect();
  return {
    left: isUserMessage ? rect.right : rect.left,
    top: rect.bottom + 4,
    side: isUserMessage ? "user" : "assistant",
  };
}

export function ConversationFeed({ className = "", children, ...props }: HTMLAttributes<HTMLDivElement>) {
  const { t } = useI18n();
  const reduceMotion = useReducedMotion();
  const metaOwnerRef = useRef(Symbol("conversation-feed-meta"));
  const hoveredMessageRef = useRef<HTMLElement | null>(null);
  const hideTimerRef = useRef<number | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  const feedbackByMessageRef = useRef(new WeakMap<HTMLElement, MessageFeedback>());
  const feedbackDialogRef = useRef<HTMLElement>(null);
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
    const messageContainsNonTextRegion = Boolean(
      message?.matches(conversationNonTextRegionSelector)
      || message?.querySelector(conversationNonTextRegionSelector),
    );
    if (eventTarget.closest<HTMLElement>(conversationNonTextRegionSelector) || messageContainsNonTextRegion) {
      if (hideTimerRef.current !== null) window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
      hoveredMessageRef.current = null;
      setMetaPosition(null);
      return;
    }
    if (!message) {
      if (hoveredMessageRef.current) scheduleMetaHide();
      return;
    }
    window.dispatchEvent(new CustomEvent(conversationMetaClaimEvent, { detail: metaOwnerRef.current }));
    keepMetaOpen();
    if (hoveredMessageRef.current === message && metaPosition) return;
    hoveredMessageRef.current = message;
    setMetaPosition(getMessageMetaPosition(message));
  };

  const copyHoveredMessage = async () => {
    const message = hoveredMessageRef.current;
    const text = message ? getCopyableMessageText(message) : "";
    if (!text) return;
    const copied = await writeClipboardText(text);
    setToast(t(copied ? "复制成功" : "复制失败，请重试"));
    if (toastTimerRef.current !== null) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => {
      toastTimerRef.current = null;
      setToast("");
    }, 2000);
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
  useModalFocus(feedbackDialogRef, Boolean(feedbackMessage), closeFeedbackDialog, hoveredMessageRef);

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
    const dismissOtherFeedMeta = (event: Event) => {
      if ((event as CustomEvent<symbol>).detail === metaOwnerRef.current) return;
      if (hideTimerRef.current !== null) {
        window.clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
      hoveredMessageRef.current = null;
      setMetaPosition(null);
    };
    const reposition = () => {
      const message = hoveredMessageRef.current;
      if (message) setMetaPosition(getMessageMetaPosition(message));
    };
    const hideWhileScrolling = () => {
      hoveredMessageRef.current = null;
      setMetaPosition(null);
    };
    window.addEventListener(conversationMetaClaimEvent, dismissOtherFeedMeta);
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", hideWhileScrolling, true);
    return () => {
      window.removeEventListener(conversationMetaClaimEvent, dismissOtherFeedMeta);
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", hideWhileScrolling, true);
      if (hideTimerRef.current !== null) window.clearTimeout(hideTimerRef.current);
      if (toastTimerRef.current !== null) window.clearTimeout(toastTimerRef.current);
    };
  }, []);

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
              <div><IconControl label={t("复制消息")} variant="bare" size="xsmall" onClick={copyHoveredMessage}><FigmaIcon name="copy" size={16} /></IconControl></div>
            </>
          ) : (
            <>
              <div>
                <IconControl label={t("复制消息")} variant="bare" size="xsmall" onClick={copyHoveredMessage}><FigmaIcon name="copy" size={16} /></IconControl>
                <IconControl label={t("赞同消息")} variant="bare" size="xsmall" aria-pressed={currentFeedback?.reaction === "like"} onClick={likeHoveredMessage}>
                  <AnimatePresence initial={false} mode="wait">
                    <motion.span className="conversation-feedback-icon" key={currentFeedback?.reaction === "like" ? "like-filled" : "like"} initial={reduceMotion ? false : { opacity: 0, scale: 0.72, rotate: -8 }} animate={{ opacity: 1, scale: 1, rotate: 0 }} exit={reduceMotion ? undefined : { opacity: 0, scale: 0.84 }} transition={{ duration: reduceMotion ? 0 : 0.2, ease: revealEase }}>
                      <FigmaIcon name={currentFeedback?.reaction === "like" ? "like-filled" : "like"} size={16} />
                    </motion.span>
                  </AnimatePresence>
                </IconControl>
                <IconControl label={t("不赞同消息")} variant="bare" size="xsmall" aria-pressed={currentFeedback?.reaction === "dislike"} onClick={openFeedbackDialog}>
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
      <Toast message={toast} />
      {feedbackMessage && typeof document !== "undefined" && createPortal(
        <motion.div className="conversation-feedback-backdrop" role="presentation" initial={reduceMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: reduceMotion ? 0 : 0.2 }} onPointerDown={(event) => { if (event.target === event.currentTarget) closeFeedbackDialog(); }}>
          <motion.section ref={feedbackDialogRef} className="conversation-feedback-dialog" role="dialog" aria-modal="true" aria-labelledby="conversation-feedback-title" initial={reduceMotion ? false : { opacity: 0, y: 10, scale: 0.985 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: reduceMotion ? 0 : 0.2, ease: revealEase }}>
            <header>
              <h2 id="conversation-feedback-title">{t("帮助改进")}</h2>
              <IconControl label={t("关闭")} variant="ghost" size="medium" onClick={closeFeedbackDialog}><FigmaIcon name="close" size={20} /></IconControl>
            </header>
            <div className="conversation-feedback-dialog__body">
              <div className="conversation-feedback-reasons" role="group" aria-label={t("选择需要改进的原因，支持多选")}>
                {feedbackReasons.map((reason) => {
                  const selected = selectedReasons.includes(reason);
                  return <OutlineToggleButton appearance="base" selected={selected} onClick={() => toggleFeedbackReason(reason)} key={reason}>{t(reason)}</OutlineToggleButton>;
                })}
              </div>
              <label className="conversation-feedback-detail">
                <textarea value={feedbackDetail} maxLength={1000} placeholder={t("填写详情（选填）")} onChange={(event) => setFeedbackDetail(event.target.value)} />
                <span>{feedbackDetail.length}/1000</span>
              </label>
            </div>
            <footer>
              <Button variant="secondary" onClick={closeFeedbackDialog}>{t("取消")}</Button>
              <Button variant="primary" onClick={submitFeedback}>{t("提交")}</Button>
            </footer>
          </motion.section>
        </motion.div>,
        document.body,
      )}
    </>
  );
}

export function ConversationStatusIcon({ status }: { status: ConversationStepStatus }) {
  const { t } = useI18n();
  if (status === "complete") return <span className="conversation-status-icon is-complete" aria-label={t("已完成")}><FigmaIcon name="check" size={16} /></span>;
  if (status === "loading") return <span className="conversation-status-icon is-loading" aria-label={t("进行中")}><img className="conversation-loading-asset" src={assetUrl("assets/figma-icons/demand-loading.svg")} alt="" /></span>;
  return <span className="conversation-status-icon is-pending" aria-label={t("待处理")} />;
}

export function TaskProgressSummary({ labels, states, completeLabel = "任务已完成" }: { labels: readonly string[]; states: readonly ConversationStepStatus[]; completeLabel?: string }) {
  const reduceMotion = useReducedMotion();
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const loadingIndex = states.findIndex((status) => status === "loading");
  const pendingIndex = states.findIndex((status) => status === "pending");
  const completedCount = states.filter((status) => status === "complete").length;
  const complete = completedCount === labels.length;
  const currentIndex = loadingIndex >= 0 ? loadingIndex : Math.max(pendingIndex, 0);
  const nextIndex = currentIndex >= 0 ? currentIndex + 1 : -1;
  const completedLabels = labels.filter((_, index) => states[index] === "complete");

  return (
    <div className="task-progress-summary" data-message-meta="disabled" data-copy-exclude="true">
      <div className="task-progress-summary__primary">
        <ConversationStatusIcon status={complete ? "complete" : states[currentIndex]} />
        <span><small>{complete ? "已完成" : "当前"}</small><strong>{complete ? completeLabel : labels[currentIndex]}</strong></span>
      </div>
      {!complete && nextIndex < labels.length ? (
        <div className="task-progress-summary__next">
          <ConversationStatusIcon status="pending" />
          <span><small>下一步</small><strong>{labels[nextIndex]}</strong></span>
        </div>
      ) : null}
      {completedCount > 0 ? (
        <div className="task-progress-summary__history-group">
          <button
            type="button"
            className="task-progress-summary__history-toggle"
            aria-expanded={historyExpanded}
            onClick={() => setHistoryExpanded((expanded) => !expanded)}
          >
            <motion.span
              className="task-progress-summary__history-chevron"
              animate={{ rotate: historyExpanded ? 90 : 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.24, ease: revealEase }}
            >
              <FigmaIcon name="chevron-right" size={16} />
            </motion.span>
            <span>已完成 {completedCount} 项</span>
          </button>
          <AnimatePresence initial={false}>
            {historyExpanded ? (
              <motion.div
                className="task-progress-summary__history-clip"
                initial={reduceMotion ? false : { height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={reduceMotion ? undefined : { height: 0, opacity: 0 }}
                transition={{ duration: reduceMotion ? 0 : 0.24, ease: revealEase }}
              >
                <div className="task-progress-summary__history">
                  {completedLabels.map((label) => (
                    <div className="task-progress-summary__history-row" key={label}>
                      <span className="task-progress-summary__history-leading" aria-hidden="true">
                        <FigmaIcon name="dot" size={16} />
                      </span>
                      <span>{label}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      ) : null}
    </div>
  );
}

export function AnalysisStepIcon({ complete, delay = 0 }: { complete: boolean; delay?: number }) {
  const reduceMotion = useReducedMotion();
  const taskComplete = useContext(TaskDisclosureCompleteContext);
  const effectiveComplete = taskComplete ?? complete;
  return (
    <span className="conversation-step-state-icon" aria-hidden="true">
      <AnimatePresence initial={false} mode="sync">
        <motion.span
          className={`conversation-step-state-icon__glyph ${effectiveComplete ? "conversation-step-complete-icon" : "conversation-step-search-icon"}`}
          key={effectiveComplete ? "complete" : "searching"}
          initial={reduceMotion ? false : { opacity: 0, scale: effectiveComplete ? 0.72 : 0.9, rotate: effectiveComplete ? -10 : 0 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          exit={reduceMotion ? undefined : { opacity: 0, scale: effectiveComplete ? 0.82 : 1.12, rotate: effectiveComplete ? 0 : 8 }}
          transition={{ duration: reduceMotion ? 0 : 0.24, delay: reduceMotion ? 0 : delay, ease: revealEase }}
        >
          <FigmaIcon name={effectiveComplete ? "dot" : "search"} size={16} />
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
    <div className="conversation-analysis-task" ref={rootRef} data-message-meta="disabled">
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
        <TaskDisclosureCompleteContext.Provider value={complete}>
          {children}
        </TaskDisclosureCompleteContext.Provider>
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

export type ConversationSingleChoiceOption = {
  value: string;
  label: ReactNode;
};

export function ConversationSingleChoiceList({
  options,
  value,
  disabled = false,
  ariaLabel,
  onChange,
}: {
  options: readonly ConversationSingleChoiceOption[];
  value: string;
  disabled?: boolean;
  ariaLabel: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className={`conversation-single-choice-list ${disabled ? "is-readonly" : ""}`} role="radiogroup" aria-label={ariaLabel}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <SelectionCard
            mode="radio"
            selected={selected}
            disabled={disabled}
            title={option.label}
            onSelect={() => onChange(option.value)}
            key={option.value}
          />
        );
      })}
    </div>
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
