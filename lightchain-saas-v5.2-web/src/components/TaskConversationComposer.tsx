import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useAutoGrowTextarea } from "../hooks/useAutoGrowTextarea";
import { assetUrl } from "../utils/assets";
import { fileIconAssetPath } from "../utils/fileIcon";
import { FigmaIcon } from "./FigmaIcon";
import { IconControl } from "./IconControl";

export type TaskConversationAttachment = {
  name: string;
  previewUrl?: string;
};

export type TaskConversationExceptionNotice = {
  message: string;
  actionLabel: string;
  onAction: () => void;
  processing?: boolean;
};

type ComposerAttachment = TaskConversationAttachment & {
  id: string;
  kind: "file" | "image";
};

type TaskConversationComposerProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (attachments: TaskConversationAttachment[]) => void;
  placeholder: string;
  ariaLabel: string;
  hint?: string;
  points?: number;
  disabled?: boolean;
  isRunning?: boolean;
  onStop?: () => void;
  className?: string;
  motionDelay?: number;
  focusRequest?: number;
  exceptionNotice?: TaskConversationExceptionNotice | null;
  attachmentMode?: "mixed" | "image-only";
};

const revealEase = [0.22, 1, 0.36, 1] as const;

export function TaskConversationComposer({
  value,
  onChange,
  onSubmit,
  placeholder,
  ariaLabel,
  hint = "Enter 发送 · Shift + Enter 换行",
  points,
  disabled = false,
  isRunning = false,
  onStop,
  className = "",
  motionDelay = 0,
  focusRequest = 0,
  exceptionNotice = null,
  attachmentMode = "mixed",
}: TaskConversationComposerProps) {
  const [attachmentMenuOpen, setAttachmentMenuOpen] = useState(false);
  const [attachments, setAttachments] = useState<ComposerAttachment[]>([]);
  const attachmentMenuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const composerRef = useRef<HTMLDivElement>(null);
  const attachmentUrlsRef = useRef(new Set<string>());
  const reduceMotion = useReducedMotion();
  const imageOnlyAttachments = attachmentMode === "image-only";
  const { textareaRef, height } = useAutoGrowTextarea(value, 144, 320, 64 + (attachments.length ? 36 : 0));

  useEffect(() => {
    if (!focusRequest || disabled || isRunning) return;
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.focus();
    textarea.setSelectionRange(textarea.value.length, textarea.value.length);
  }, [disabled, focusRequest, isRunning, textareaRef]);

  useEffect(() => {
    const conversationStage = composerRef.current?.closest<HTMLElement>(".conversation-stage");
    if (!conversationStage) return;
    conversationStage.style.setProperty("--conversation-composer-clearance", `${height + 48 + (exceptionNotice ? 48 : 0)}px`);
    return () => {
      conversationStage.style.removeProperty("--conversation-composer-clearance");
    };
  }, [exceptionNotice, height]);

  useEffect(() => {
    const conversationStage = composerRef.current?.closest<HTMLElement>(".conversation-stage");
    const conversationScroll = conversationStage?.querySelector<HTMLElement>(".conversation-scroll");
    const conversationFeed = conversationStage?.querySelector<HTMLElement>(".conversation-feed");
    if (!conversationScroll || !conversationFeed) return;

    let followLatest = conversationScroll.scrollHeight - conversationScroll.scrollTop - conversationScroll.clientHeight <= 48;
    let frame = 0;
    const updateFollowState = () => {
      followLatest = conversationScroll.scrollHeight - conversationScroll.scrollTop - conversationScroll.clientHeight <= 48;
    };
    const keepLatestVisible = () => {
      if (!followLatest) return;
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        conversationScroll.scrollTop = conversationScroll.scrollHeight;
      });
    };
    const resizeObserver = new ResizeObserver(keepLatestVisible);

    conversationScroll.addEventListener("scroll", updateFollowState, { passive: true });
    resizeObserver.observe(conversationFeed);
    keepLatestVisible();

    return () => {
      window.cancelAnimationFrame(frame);
      conversationScroll.removeEventListener("scroll", updateFollowState);
      resizeObserver.disconnect();
    };
  }, [height]);

  useEffect(() => {
    if (!attachmentMenuOpen) return;
    const dismissMenu = (event: PointerEvent) => {
      if (!attachmentMenuRef.current?.contains(event.target as Node)) setAttachmentMenuOpen(false);
    };
    const dismissMenuOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setAttachmentMenuOpen(false);
    };
    document.addEventListener("pointerdown", dismissMenu);
    document.addEventListener("keydown", dismissMenuOnEscape);
    return () => {
      document.removeEventListener("pointerdown", dismissMenu);
      document.removeEventListener("keydown", dismissMenuOnEscape);
    };
  }, [attachmentMenuOpen]);

  useEffect(() => {
    if (imageOnlyAttachments) setAttachmentMenuOpen(false);
  }, [imageOnlyAttachments]);

  useEffect(() => () => {
    attachmentUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    attachmentUrlsRef.current.clear();
  }, []);

  const addAttachments = (event: ChangeEvent<HTMLInputElement>, kind: ComposerAttachment["kind"]) => {
    const files = Array.from(event.currentTarget.files ?? []);
    if (!files.length) return;
    const created = files.map((file, index) => {
      const previewUrl = kind === "image" ? URL.createObjectURL(file) : undefined;
      if (previewUrl) attachmentUrlsRef.current.add(previewUrl);
      return {
        id: `${file.name}-${file.lastModified}-${Date.now()}-${index}`,
        name: file.name,
        kind,
        previewUrl,
      } satisfies ComposerAttachment;
    });
    setAttachments((current) => [...current, ...created]);
    event.currentTarget.value = "";
  };

  const removeAttachment = (id: string) => {
    setAttachments((current) => current.filter((attachment) => {
      if (attachment.id !== id) return true;
      if (attachment.previewUrl) {
        URL.revokeObjectURL(attachment.previewUrl);
        attachmentUrlsRef.current.delete(attachment.previewUrl);
      }
      return false;
    }));
  };

  const consumeAttachments = () => {
    const submitted = attachments.map(({ name, previewUrl }) => ({ name, previewUrl }));
    setAttachments([]);
    return submitted;
  };

  const submit = () => {
    if (disabled || isRunning || (!value.trim() && !attachments.length)) return;
    onSubmit(consumeAttachments());
  };

  const shellHeight = height + (exceptionNotice ? 48 : 0);

  return (
    <motion.div
      ref={composerRef}
      className={`conversation-composer-shell ${exceptionNotice ? "has-exception" : ""}`}
      style={{ height: shellHeight }}
      initial={reduceMotion ? false : { opacity: 0, y: 18, x: "-50%" }}
      animate={{ opacity: 1, y: 0, x: "-50%" }}
      transition={{ duration: reduceMotion ? 0 : 0.46, delay: reduceMotion ? 0 : motionDelay, ease: revealEase }}
    >
      <AnimatePresence initial={false}>
        {exceptionNotice ? (
          <motion.div
            className="conversation-composer-exception"
            role="alert"
            aria-live="assertive"
            initial={reduceMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
            transition={{ duration: reduceMotion ? 0 : 0.24, ease: revealEase }}
          >
            <div className="conversation-composer-exception__content">
              <FigmaIcon name="exclamation" size={20} />
              <span className={exceptionNotice.processing ? "conversation-analysis-title is-loading" : undefined}>{exceptionNotice.message}</span>
              <button type="button" onClick={exceptionNotice.onAction}>{exceptionNotice.actionLabel}</button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
      <section
        className={`conversation-composer composer__input ${className}`}
        aria-label={ariaLabel}
        style={{ height }}
      >
        <div className="composer__content">
        <AnimatePresence initial={false}>
          {attachments.length > 0 && (
            <motion.div
              className="composer-attachment-list"
              initial={reduceMotion ? false : { opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.2, ease: "easeOut" }}
            >
              {attachments.map((attachment) => (
                <motion.span
                  className="composer-attachment-chip"
                  layout
                  initial={reduceMotion ? false : { opacity: 0, scale: 0.94 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.94 }}
                  transition={{ duration: reduceMotion ? 0 : 0.16, ease: "easeOut" }}
                  key={attachment.id}
                >
                  {attachment.previewUrl ? (
                    <img className="composer-attachment-chip__thumbnail" src={attachment.previewUrl} alt="" />
                  ) : (
                    <img className="composer-attachment-chip__file" src={assetUrl(fileIconAssetPath(attachment.name))} alt="" />
                  )}
                  <span title={attachment.name}>{attachment.name}</span>
                  <button
                    type="button"
                    aria-label={`移除附件：${attachment.name}`}
                    onPointerDown={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      removeAttachment(attachment.id);
                    }}
                    onClick={(event) => {
                      event.stopPropagation();
                      removeAttachment(attachment.id);
                    }}
                  >
                    <FigmaIcon name="close" size={16} />
                  </button>
                </motion.span>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
        <div className="composer__text-wrap">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229) return;
              if (
                event.key === "Backspace"
                && !value
                && attachments.length
                && event.currentTarget.selectionStart === 0
                && event.currentTarget.selectionEnd === 0
              ) {
                event.preventDefault();
                removeAttachment(attachments[attachments.length - 1].id);
                return;
              }
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                submit();
              }
            }}
            placeholder={placeholder}
            aria-label={placeholder}
            disabled={disabled || isRunning}
          />
        </div>
        </div>
        <div className="conversation-composer__left-actions">
        <div className="composer-attachment" ref={attachmentMenuRef}>
          <IconControl
            className="composer-attachment__button"
            label={imageOnlyAttachments ? "添加图片" : "添加附件"}
            tooltipPlacement="top"
            selected={!imageOnlyAttachments && attachmentMenuOpen}
            disabled={disabled || isRunning}
            aria-haspopup={imageOnlyAttachments ? undefined : "menu"}
            aria-expanded={imageOnlyAttachments ? undefined : attachmentMenuOpen}
            onClick={() => {
              if (imageOnlyAttachments) {
                imageInputRef.current?.click();
                return;
              }
              setAttachmentMenuOpen((open) => !open);
            }}
          >
            <FigmaIcon name="plus" size={20} />
          </IconControl>
          <AnimatePresence>
            {!imageOnlyAttachments && attachmentMenuOpen && (
              <motion.div
                className="composer-attachment-menu"
                role="menu"
                aria-label="添加附件"
                initial={reduceMotion ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: reduceMotion ? 0 : 0.16, ease: "easeOut" }}
              >
                <button type="button" role="menuitem" onClick={() => { setAttachmentMenuOpen(false); fileInputRef.current?.click(); }}>
                  <FigmaIcon name="add-file" size={16} />
                  <span>文件</span>
                </button>
                <button type="button" role="menuitem" onClick={() => { setAttachmentMenuOpen(false); imageInputRef.current?.click(); }}>
                  <FigmaIcon name="add-image" size={16} />
                  <span>图片</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
          {!imageOnlyAttachments ? <input ref={fileInputRef} className="composer-attachment__input" type="file" multiple tabIndex={-1} aria-label="选择要上传的文件" onChange={(event) => addAttachments(event, "file")} /> : null}
          <input ref={imageInputRef} className="composer-attachment__input" type="file" accept="image/*" multiple tabIndex={-1} aria-label="选择要上传的图片" onChange={(event) => addAttachments(event, "image")} />
        </div>
        </div>
        <div className="conversation-composer__send-meta">
          <span>{hint}</span>
          {points !== undefined ? (
            <span className="conversation-composer__points" aria-label={`${points} 积分`}>
              <FigmaIcon name="points-star" size={16} />
              <span>{points}</span>
            </span>
          ) : null}
        </div>
        <IconControl
          className={`composer__send conversation-composer__send ${isRunning ? "is-running" : ""}`}
          label={isRunning ? "暂停当前任务" : "发送"}
          tooltipPlacement="top"
          disabled={isRunning ? !onStop : disabled || (!value.trim() && !attachments.length)}
          onClick={isRunning ? onStop : submit}
        >
          {isRunning ? (
            <img className="conversation-composer__stop-icon" src={assetUrl("assets/figma-icons/stop.svg")} alt="" />
          ) : (
            <FigmaIcon name="arrow-up" size={24} />
          )}
        </IconControl>
      </section>
    </motion.div>
  );
}
