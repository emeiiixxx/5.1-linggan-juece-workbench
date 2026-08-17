import { createContext, useCallback, useContext, useEffect, useRef, useState, type HTMLAttributes, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
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
import { CircleCheckbox } from "./CircleCheckbox";
import { downloadImageZip } from "../utils/downloadZip";
import { ProgressiveImage } from "./ProgressiveImage";
import { ConversationUserAttachments, type ConversationUserAttachment } from "./ConversationUserAttachments";

export type ConversationStepStatus = "complete" | "loading" | "pending";

const revealEase = [0.22, 1, 0.36, 1] as const;
const conversationMetaClaimEvent = "lightchain:conversation-meta-claim";
const TaskDisclosureCompleteContext = createContext<boolean | null>(null);

type MessageMetaPosition = { left: number; top: number; side: "assistant" | "user"; copyEnabled: boolean };
type MessageFeedback = {
  reaction: "like" | "dislike";
  reasons?: string[];
  detail?: string;
};

const feedbackReasons = ["不正确 / 不完整", "没有遵循我的指示", "速度慢", "偏题 / 超出范围", "其他"];
const conversationMetaDisabledRegionSelector = [
  '[data-message-meta="disabled"]',
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
const conversationCopyExcludedRegionSelector = [
  conversationMetaDisabledRegionSelector,
  '[data-copy-exclude="true"]',
].join(", ");

function getCopyableMessageText(message: HTMLElement) {
  const copy = message.cloneNode(true) as HTMLElement;
  copy.querySelectorAll(`${conversationCopyExcludedRegionSelector}, button, [role="button"], input, textarea, select, img, picture, video, canvas`).forEach((element) => element.remove());
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

function getMessageMetaPosition(message: HTMLElement, metaSize?: { width: number; height: number }): MessageMetaPosition {
  const isUserMessage = message.classList.contains("conversation-message--user");
  const copyEnabled = !message.matches('[data-message-copy="disabled"]')
    && !message.querySelector('[data-message-copy="disabled"]');
  const anchor = isUserMessage
    ? message.querySelector<HTMLElement>(".conversation-user-bubble") ?? message
    : message;
  const rect = anchor.getBoundingClientRect();
  const viewportPadding = 8;
  const metaWidth = metaSize?.width ?? (isUserMessage ? 64 : copyEnabled ? 112 : 88);
  const metaHeight = metaSize?.height ?? 28;
  const desiredLeft = isUserMessage ? rect.right : rect.left;
  const left = isUserMessage
    ? Math.min(Math.max(desiredLeft, viewportPadding + metaWidth), window.innerWidth - viewportPadding)
    : Math.min(Math.max(desiredLeft, viewportPadding), window.innerWidth - metaWidth - viewportPadding);
  const top = Math.min(Math.max(rect.bottom + 4, viewportPadding), window.innerHeight - metaHeight - viewportPadding);
  return {
    left,
    top,
    side: isUserMessage ? "user" : "assistant",
    copyEnabled,
  };
}

export function ConversationFeed({ className = "", children, ...props }: HTMLAttributes<HTMLDivElement>) {
  const { t } = useI18n();
  const reduceMotion = useReducedMotion();
  const metaOwnerRef = useRef(Symbol("conversation-feed-meta"));
  const hoveredMessageRef = useRef<HTMLElement | null>(null);
  const metaElementRef = useRef<HTMLDivElement>(null);
  const metaResizeObserverRef = useRef<ResizeObserver | null>(null);
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

  const measureMessageMetaPosition = useCallback((message: HTMLElement) => {
    const meta = metaElementRef.current;
    return getMessageMetaPosition(message, meta ? { width: meta.offsetWidth, height: meta.offsetHeight } : undefined);
  }, []);

  const dismissMessageMeta = useCallback(() => {
    if (hideTimerRef.current !== null) window.clearTimeout(hideTimerRef.current);
    hideTimerRef.current = null;
    metaResizeObserverRef.current?.disconnect();
    metaResizeObserverRef.current = null;
    hoveredMessageRef.current = null;
    setMetaPosition(null);
  }, []);

  const keepMetaOpen = () => {
    if (hideTimerRef.current === null) return;
    window.clearTimeout(hideTimerRef.current);
    hideTimerRef.current = null;
  };

  const scheduleMetaHide = () => {
    if (hideTimerRef.current !== null) return;
    hideTimerRef.current = window.setTimeout(dismissMessageMeta, 220);
  };

  const showMessageMeta = (event: ReactPointerEvent<HTMLDivElement>) => {
    const eventTarget = event.target as HTMLElement;
    const message = eventTarget.closest<HTMLElement>('[data-message-actions="true"]')
      ?? eventTarget.closest<HTMLElement>(".conversation-message--user");
    const messageContainsMetaDisabledRegion = Boolean(
      message?.matches(conversationMetaDisabledRegionSelector)
      || message?.querySelector(conversationMetaDisabledRegionSelector),
    );
    if (eventTarget.closest<HTMLElement>(conversationMetaDisabledRegionSelector) || messageContainsMetaDisabledRegion) {
      dismissMessageMeta();
      return;
    }
    if (!message) {
      if (hoveredMessageRef.current) scheduleMetaHide();
      return;
    }
    window.dispatchEvent(new CustomEvent(conversationMetaClaimEvent, { detail: metaOwnerRef.current }));
    keepMetaOpen();
    if (hoveredMessageRef.current === message && metaPosition) {
      setMetaPosition(measureMessageMetaPosition(message));
      return;
    }
    metaResizeObserverRef.current?.disconnect();
    hoveredMessageRef.current = message;
    setMetaPosition(measureMessageMetaPosition(message));
    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(() => {
        if (!message.isConnected) {
          dismissMessageMeta();
          return;
        }
        if (hoveredMessageRef.current === message) setMetaPosition(measureMessageMetaPosition(message));
      });
      observer.observe(message);
      const feed = message.closest<HTMLElement>(".conversation-feed");
      if (feed && feed !== message) observer.observe(feed);
      metaResizeObserverRef.current = observer;
    }
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
      dismissMessageMeta();
    };
    const reposition = () => {
      const message = hoveredMessageRef.current;
      if (!message?.isConnected) {
        dismissMessageMeta();
        return;
      }
      setMetaPosition(measureMessageMetaPosition(message));
    };
    const dismissOnOutsideInteraction = (event: Event) => {
      const target = event.target;
      if (target instanceof Element && target.closest(".conversation-message-meta--floating")) return;
      dismissMessageMeta();
    };
    window.addEventListener(conversationMetaClaimEvent, dismissOtherFeedMeta);
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", dismissMessageMeta, true);
    document.addEventListener("pointerdown", dismissOnOutsideInteraction, true);
    document.addEventListener("focusin", dismissOnOutsideInteraction, true);
    document.addEventListener("keydown", dismissOnOutsideInteraction, true);
    return () => {
      window.removeEventListener(conversationMetaClaimEvent, dismissOtherFeedMeta);
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", dismissMessageMeta, true);
      document.removeEventListener("pointerdown", dismissOnOutsideInteraction, true);
      document.removeEventListener("focusin", dismissOnOutsideInteraction, true);
      document.removeEventListener("keydown", dismissOnOutsideInteraction, true);
      metaResizeObserverRef.current?.disconnect();
      if (hideTimerRef.current !== null) window.clearTimeout(hideTimerRef.current);
      if (toastTimerRef.current !== null) window.clearTimeout(toastTimerRef.current);
    };
  }, [dismissMessageMeta, measureMessageMetaPosition]);

  useEffect(() => {
    const message = hoveredMessageRef.current;
    const meta = metaElementRef.current;
    if (!message || !meta) return;
    const next = getMessageMetaPosition(message, { width: meta.offsetWidth, height: meta.offsetHeight });
    setMetaPosition((current) => current
      && current.left === next.left
      && current.top === next.top
      && current.side === next.side
      && current.copyEnabled === next.copyEnabled
      ? current
      : next);
  }, [measureMessageMetaPosition, metaPosition?.side, metaPosition?.copyEnabled]);

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
          ref={metaElementRef}
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
                {metaPosition.copyEnabled ? <IconControl label={t("复制消息")} variant="bare" size="xsmall" onClick={copyHoveredMessage}><FigmaIcon name="copy" size={16} /></IconControl> : null}
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
    <section className="trend-file-card" data-copy-exclude="true">
      <span className="trend-file-card__icon" aria-hidden="true"><span /><img src={assetUrl(`assets/figma-icons/file-${icon}.svg`)} alt="" /></span>
      <div className="trend-file-card__info"><strong>{name}</strong><span>{description}</span></div>
      <div className="trend-file-card__actions">{children}</div>
    </section>
  );
}

export function ImageSelectionActions({
  selectedCount,
  totalCount,
  disabled = false,
  hint = "重新生成只针对选中的图片",
  onToggleAll,
  children,
}: {
  selectedCount: number;
  totalCount: number;
  disabled?: boolean;
  hint?: string;
  onToggleAll: () => void;
  children?: ReactNode;
}) {
  const allSelected = totalCount > 0 && selectedCount === totalCount;
  return (
    <div className="new-product-results-actions">
      <SelectAllControl
        selected={allSelected}
        disabled={disabled || totalCount === 0}
        className="image-selection-select-all"
        onToggle={onToggleAll}
      />
      <span className="image-selection-actions-divider" aria-hidden="true" />
      <span className="image-selection-count">已选择 <strong>{selectedCount}</strong> 张图片</span>
      <span className="image-selection-actions-hint">{hint}</span>
      {children}
    </div>
  );
}

export function SelectAllControl({
  selected,
  disabled = false,
  onToggle,
  className = "",
}: {
  selected: boolean;
  disabled?: boolean;
  onToggle: () => void;
  className?: string;
}) {
  const { t } = useI18n();
  return (
    <button
      type="button"
      className={`selection-select-all ${className}`.trim()}
      aria-pressed={selected}
      disabled={disabled}
      onClick={onToggle}
    >
      <CircleCheckbox checked={selected} size="small" />
      <span>{t("全选")}</span>
    </button>
  );
}

export function TaskArtifactRow({
  kind,
  children,
  onClick,
  disabled = false,
}: {
  kind: "file" | "image";
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  const content = (
    <>
      <FigmaIcon name={kind === "file" ? "add-file" : "image-generation"} size={16} />
      <span>{children}</span>
    </>
  );

  return onClick ? (
    <button
      type="button"
      className="task-detail-row task-detail-row--artifact task-detail-row--interactive"
      disabled={disabled}
      onClick={onClick}
    >
      {content}
    </button>
  ) : <div className="task-detail-row task-detail-row--artifact">{content}</div>;
}

export type TaskDetailReferenceLink = {
  id?: string;
  label: string;
  href: string;
  thumbnail?: string;
  meta?: string;
  date?: string;
};

const REFERENCE_VIEW_ALL_THRESHOLD = 10;

export function TaskDetailPanel({
  ariaLabel,
  onCollapse,
  artifacts,
  references,
  referenceTitle = "参考信息",
  onReferenceSelect,
}: {
  ariaLabel: string;
  onCollapse: () => void;
  artifacts?: ReactNode;
  references: readonly TaskDetailReferenceLink[];
  referenceTitle?: string;
  onReferenceSelect?: (reference: TaskDetailReferenceLink) => void;
}) {
  const { t } = useI18n();
  const [referenceExpanded, setReferenceExpanded] = useState(false);
  const [referenceDownloading, setReferenceDownloading] = useState(false);
  const [overviewReferenceLimit, setOverviewReferenceLimit] = useState(references.length);
  const overviewReferenceListRef = useRef<HTMLDivElement | null>(null);
  const isReferenceGallery = references.some((reference) => reference.thumbnail);
  const canViewAllReferences = isReferenceGallery && references.length >= REFERENCE_VIEW_ALL_THRESHOLD;
  const overviewReferences = canViewAllReferences ? references.slice(0, overviewReferenceLimit) : references;

  useEffect(() => {
    if (!canViewAllReferences) setReferenceExpanded(false);
  }, [canViewAllReferences]);

  useEffect(() => {
    if (!canViewAllReferences) {
      setOverviewReferenceLimit(references.length);
      return;
    }

    const list = overviewReferenceListRef.current;
    if (!list) return;
    const updateVisibleReferenceCount = () => {
      const firstRow = list.querySelector<HTMLElement>(".task-detail-row--reference");
      if (!firstRow) return;
      const gap = Number.parseFloat(window.getComputedStyle(list).rowGap) || 0;
      const rowHeight = firstRow.getBoundingClientRect().height;
      if (!rowHeight) return;
      const visibleCount = Math.max(1, Math.floor(list.clientHeight / (rowHeight + gap)));
      setOverviewReferenceLimit(Math.min(references.length, visibleCount));
    };

    updateVisibleReferenceCount();
    if (typeof ResizeObserver === "undefined") return;
    const resizeObserver = new ResizeObserver(updateVisibleReferenceCount);
    resizeObserver.observe(list);
    return () => resizeObserver.disconnect();
  }, [canViewAllReferences, references.length]);

  const renderReference = (reference: TaskDetailReferenceLink, expanded = false) => {
    const content = (
      <>
        {reference.thumbnail ? (
          <ProgressiveImage
            className="task-detail-reference-thumbnail"
            src={assetUrl(reference.thumbnail)}
            alt=""
            aria-hidden="true"
          />
        ) : <FigmaIcon name="global" size={16} />}
        <span className="task-detail-reference-copy">
          <span className="task-detail-reference-label" title={reference.label}>{reference.label}</span>
          {(expanded || !reference.thumbnail) && reference.meta ? <span className="task-detail-reference-meta">{reference.meta}</span> : null}
          {expanded && reference.date ? <span className="task-detail-reference-date">{reference.date}</span> : null}
        </span>
      </>
    );
    const className = `task-detail-row task-detail-row--reference ${reference.thumbnail ? "task-detail-row--reference-media" : ""} ${expanded ? "task-detail-row--reference-expanded" : ""}`;

    return reference.thumbnail && onReferenceSelect ? (
      <button
        type="button"
        className={className}
        onClick={() => onReferenceSelect(reference)}
        key={reference.id ?? reference.href}
      >
        {content}
      </button>
    ) : (
      <a
        className={className}
        href={reference.href}
        target="_blank"
        rel="noreferrer"
        key={reference.id ?? reference.href}
      >
        {content}
      </a>
    );
  };

  const downloadAllReferenceImages = async () => {
    if (referenceDownloading) return;
    const imageReferences = references.filter((reference) => reference.thumbnail);
    if (!imageReferences.length) return;
    setReferenceDownloading(true);
    try {
      await downloadImageZip(`${referenceTitle}-全部参考图.zip`, imageReferences.map((reference, index) => {
        const thumbnail = reference.thumbnail!;
        const extension = thumbnail.split("?")[0].match(/\.([a-z0-9]+)$/i)?.[1] ?? "jpg";
        const safeLabel = reference.label.replace(/[\\/:*?"<>|]/g, "-");
        return {
          name: `${String(index + 1).padStart(2, "0")}-${safeLabel}.${extension}`,
          url: assetUrl(thumbnail),
        };
      }));
    } catch {
      window.alert(t("参考图下载失败，请稍后重试。"));
    } finally {
      setReferenceDownloading(false);
    }
  };

  return (
    <div className={`task-detail-panel ${referenceTitle === "参考信息" ? "is-reference-information" : ""} ${canViewAllReferences ? "has-reference-overflow" : ""} ${referenceExpanded ? "is-reference-expanded" : ""}`} aria-label={ariaLabel}>
      <div className="task-detail-panel__view task-detail-panel__overview-view">
        <header>
          <strong>概览</strong>
          <button type="button" onClick={onCollapse} aria-label="收起概览"><FigmaIcon name="expand-window" size={20} /></button>
        </header>
        {artifacts !== undefined ? (
          <section>
            <h2>任务产物</h2>
            {artifacts}
          </section>
        ) : null}
        {references.length ? (
          <section>
            {isReferenceGallery ? (
              <div className="task-detail-reference-heading">
                <span className="task-detail-reference-heading-title">
                  <h2>{referenceTitle}</h2>
                  <IconControl
                    label={t("下载全部参考图")}
                    size="xsmall"
                    variant="bare"
                    disabled={referenceDownloading}
                    onClick={downloadAllReferenceImages}
                  >
                    <FigmaIcon name="download" size={16} />
                  </IconControl>
                </span>
                {canViewAllReferences ? (
                  <button
                    className="task-detail-reference-view-all"
                    type="button"
                    onClick={() => setReferenceExpanded(true)}
                  >
                    <span>{t("查看全部")}</span>
                    <FigmaIcon name="chevron-right" size={16} />
                  </button>
                ) : null}
              </div>
            ) : <h2>{referenceTitle}</h2>}
            <div ref={overviewReferenceListRef} className="task-detail-reference-list">
              {overviewReferences.map((reference) => renderReference(reference))}
            </div>
          </section>
        ) : null}
      </div>
      {canViewAllReferences ? (
        <div className="task-detail-panel__view task-detail-panel__reference-view">
          <header className="task-detail-reference-view-header">
            <span>
              <strong>{referenceTitle}</strong>
              <small>{t("共 {count} 条 · 按最近获取时间排序", { count: references.length })}</small>
            </span>
            <span className="task-detail-reference-view-actions">
              <IconControl
                label={t("下载全部参考图")}
                tooltipPlacement="bottom"
                disabled={referenceDownloading}
                onClick={downloadAllReferenceImages}
              >
                <FigmaIcon name="download" size={20} />
              </IconControl>
              <IconControl label={t("关闭参考款式列表")} tooltipPlacement="bottom" onClick={() => setReferenceExpanded(false)}>
                <FigmaIcon name="close" size={20} />
              </IconControl>
            </span>
          </header>
          <div className="task-detail-reference-list task-detail-reference-list--expanded">
            {references.map((reference) => renderReference(reference, true))}
          </div>
        </div>
      ) : null}
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
    <div className="conversation-task-completion" data-message-copy={suggestions.length ? "disabled" : undefined}>
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

export function ConversationFollowUpExchange({
  request,
  attachments = [],
  response,
}: {
  request: string;
  attachments?: readonly ConversationUserAttachment[];
  response: string;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <div className="conversation-confirmed-results">
      <ConversationUserMessage entrance>
        <ConversationUserAttachments attachments={attachments} />
        {request ? <span>{request}</span> : null}
      </ConversationUserMessage>
      <motion.article
        className="conversation-message conversation-message--assistant"
        data-message-actions="true"
        initial={reduceMotion ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduceMotion ? 0 : 0.32, ease: revealEase }}
      >
        <p>{response}</p>
      </motion.article>
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
