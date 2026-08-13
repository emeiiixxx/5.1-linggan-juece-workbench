import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState, type ChangeEvent, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { quickStartCards } from "../data/workspace";
import { assetUrl } from "../utils/assets";
import { FigmaIcon } from "./FigmaIcon";
import { ArchiveHeaderMotion } from "./GlassMotion";
import { IconControl } from "./IconControl";
import { QuickStartCard } from "./QuickStartCard";
import { primaryPageEntrance, primaryPageEntranceItem, primaryPageEntranceMediaItem } from "../utils/pageMotion";
import { useI18n } from "../i18n";
import { useAutoGrowTextarea } from "../hooks/useAutoGrowTextarea";
import { gsap } from "../motion/gsap";

const ConversationWorkspace = lazy(() =>
  import("./ConversationWorkspace").then(({ ConversationWorkspace }) => ({ default: ConversationWorkspace })),
);
const ClothingConversationWorkspace = lazy(() =>
  import("./ClothingConversationWorkspace").then(({ ClothingConversationWorkspace }) => ({ default: ClothingConversationWorkspace })),
);
const NewProductPlanningWorkspace = lazy(() =>
  import("./NewProductPlanningWorkspace").then(({ NewProductPlanningWorkspace }) => ({ default: NewProductPlanningWorkspace })),
);
const PlanConversationWorkspace = lazy(() =>
  import("./PlanConversationWorkspace").then(({ PlanConversationWorkspace }) => ({ default: PlanConversationWorkspace })),
);

const tabs = ["新品企划", "客户提案", "灵感设计", "企划案"];
const composerPlaceholders = [
  "描述下一季的市场,人群,品类和经营目标...",
  "输入客户需求,或上传brief、邮件和会议纪要...",
  "输入@服装 / 图案可调用不同类型工具。例如：@服装 设计一些外套...",
  "描述企划案的主题、目标和交付要求...",
];
const inspirationDesignOptions = [
  { value: "apparel", label: "服装设计", icon: "apparel-design-menu" },
  { value: "pattern", label: "图案设计", icon: "pattern-material" },
] as const;
type InspirationDesignType = typeof inspirationDesignOptions[number]["value"];
type ProfileOption = { id: number; name: string };
type ProjectOption = { id: number; name: string };
type Attachment = { id: string; name: string; kind: "file" | "image"; previewUrl?: string };
const defaultPlanPrompt = "以 Loro Piana 的 2027春夏 系列做为设计灵感，需要包含 短款外套、衬衫、卫衣、短袖、长裤、短裤 这些品类，生成一份 男装 主题设计企划";
const defaultPlanEditorHtml = '以 <span class="composer-semantic-slot">Loro Piana</span> 的 <span class="composer-semantic-slot">2027春夏</span> 系列做为设计灵感，需要包含 <span class="composer-semantic-slot">短款外套、衬衫、卫衣、短袖、长裤、短裤</span> 这些品类，生成一份 <span class="composer-semantic-slot">男装</span> 主题设计企划';

const textOffsetWithin = (root: HTMLElement, node: Node, offset: number) => {
  const range = document.createRange();
  range.selectNodeContents(root);
  range.setEnd(node, offset);
  return range.toString().length;
};

const planEditorPointAt = (root: HTMLElement, targetOffset: number) => {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let traversed = 0;
  let node = walker.nextNode();
  while (node) {
    const length = node.textContent?.length ?? 0;
    if (traversed + length >= targetOffset) return { node, offset: targetOffset - traversed };
    traversed += length;
    node = walker.nextNode();
  }
  return { node: root as Node, offset: root.childNodes.length };
};

const normalizePlanEditorMarkup = (editor: HTMLDivElement) => {
  const selection = window.getSelection();
  const activeRange = selection?.rangeCount ? selection.getRangeAt(0) : null;
  const canRestoreSelection = Boolean(
    activeRange
    && editor.contains(activeRange.startContainer)
    && editor.contains(activeRange.endContainer),
  );
  const savedSelection = canRestoreSelection && activeRange
    ? {
        start: textOffsetWithin(editor, activeRange.startContainer, activeRange.startOffset),
        end: textOffsetWithin(editor, activeRange.endContainer, activeRange.endOffset),
      }
    : null;

  editor.querySelectorAll("font").forEach((font) => font.replaceWith(...Array.from(font.childNodes)));

  if (!selection || !savedSelection) return;
  const start = planEditorPointAt(editor, savedSelection.start);
  const end = planEditorPointAt(editor, savedSelection.end);
  const restoredRange = document.createRange();
  restoredRange.setStart(start.node, start.offset);
  restoredRange.setEnd(end.node, end.offset);
  selection.removeAllRanges();
  selection.addRange(restoredRange);
};

const semanticSlotFromNode = (node: Node | null) => {
  if (!node) return null;
  const element = node instanceof Element ? node : node.parentElement;
  return element?.closest<HTMLElement>(".composer-semantic-slot") ?? null;
};

const profileOptions: ProfileOption[] = [
  { id: 1001, name: "日本通勤女装" },
  { id: 1002, name: "灭霸毁灭宇宙回忆录" },
  { id: 1003, name: "卡宾童装" },
];

const projectOptions: ProjectOption[] = [
  { id: 0, name: "GG酱的灵感" },
  { id: 1, name: "冬季大促营销策划" },
  { id: 2, name: "Untitled" },
  { id: 3, name: "Untitled" },
  { id: 4, name: "Untitled" },
  { id: 5, name: "Untitled" },
];

export function Workspace({ theme, activeTask, newTaskKey = 0, selectedProfile, onSelectedProfileChange, selectedProject, onSelectedProjectChange, onCreateTask }: {
  theme: "dark" | "light";
  activeTask?: { id: number; prompt: string; profileName?: string; attachments?: { name: string; previewUrl?: string }[]; workflow: "new-product" | "default" | "apparel" | "plan"; initialState?: "default" | "complete" } | null;
  newTaskKey?: number;
  selectedProfile?: ProfileOption | null;
  onSelectedProfileChange?: (profile: ProfileOption | null) => void;
  selectedProject?: ProjectOption | null;
  onSelectedProjectChange?: (project: ProjectOption | null) => void;
  onCreateTask?: (task: { title: string; projectId: number | null; prompt: string; attachments?: { name: string; previewUrl?: string }[]; workflow: "new-product" | "default" | "apparel" | "plan" }) => void;
}) {
  const { locale, t } = useI18n();
  const [activeTab, setActiveTab] = useState(0);
  const [quickStartOpen, setQuickStartOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [inspirationDesignType, setInspirationDesignType] = useState<InspirationDesignType>("apparel");
  const [projectMenuOpen, setProjectMenuOpen] = useState(false);
  const [attachmentMenuOpen, setAttachmentMenuOpen] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [message, setMessage] = useState("");
  const [tabListElement, setTabListElement] = useState<HTMLDivElement | null>(null);
  const { textareaRef: composerTextareaRef, height: composerInputHeight } = useAutoGrowTextarea(message, 160);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const projectMenuRef = useRef<HTMLDivElement>(null);
  const attachmentMenuRef = useRef<HTMLDivElement>(null);
  const planEditorRef = useRef<HTMLDivElement>(null);
  const activePlanSlotRef = useRef<HTMLElement | null>(null);
  const savedPlanEditorHtmlRef = useRef(defaultPlanEditorHtml);
  const planPromptRef = useRef(defaultPlanPrompt);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const attachmentUrlsRef = useRef(new Set<string>());
  const tabIndicatorRef = useRef<HTMLSpanElement>(null);
  const tabButtonRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const indicatorPositionedRef = useRef(false);
  const activeTabRef = useRef(activeTab);
  activeTabRef.current = activeTab;
  const activeTaskId = activeTask?.id ?? null;
  const reduceMotion = useReducedMotion();
  const quickStartExpandTransition = reduceMotion
    ? { duration: 0 }
    : { type: "spring" as const, duration: 0.5, bounce: 0.24 };
  const quickStartCollapseTransition = reduceMotion
    ? { duration: 0 }
    : { type: "tween" as const, duration: 0.3, ease: "easeOut" as const };
  const quickStartLayoutTransition = quickStartOpen
    ? quickStartExpandTransition
    : quickStartCollapseTransition;
  const availableProjectOptions =
    selectedProject && !projectOptions.some((project) => project.id === selectedProject.id)
      ? [selectedProject, ...projectOptions]
      : projectOptions;
  const inspirationDesign = inspirationDesignOptions.find((option) => option.value === inspirationDesignType) ?? inspirationDesignOptions[0];
  const setPlanEditorElement = useCallback((node: HTMLDivElement | null) => {
    planEditorRef.current = node;
    if (node) node.innerHTML = savedPlanEditorHtmlRef.current;
  }, []);

  const syncPlanEditorValue = (editor: HTMLDivElement, normalizeEmptyMarkup = false) => {
    const nextPrompt = editor.innerText.replace(/\u00a0/g, " ");
    planPromptRef.current = nextPrompt;
    editor.dataset.empty = String(!nextPrompt.trim());
    if (normalizeEmptyMarkup && !nextPrompt.trim()) {
      editor.replaceChildren();
      const selection = window.getSelection();
      const range = document.createRange();
      range.setStart(editor, 0);
      range.collapse(true);
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
    savedPlanEditorHtmlRef.current = editor.innerHTML;
    const sendButton = editor.closest(".composer__input")?.querySelector<HTMLButtonElement>(".composer__send");
    if (sendButton) sendButton.disabled = !nextPrompt.trim();
  };

  const syncTabIndicator = useCallback((animate: boolean) => {
    const indicator = tabIndicatorRef.current;
    const activeButton = tabButtonRefs.current[activeTabRef.current];
    if (!tabListElement || !indicator || !activeButton) return;

    const target = {
      left: Math.round(activeButton.offsetLeft),
      width: Math.round(activeButton.offsetWidth),
    };

    gsap.killTweensOf(indicator);
    gsap.set(indicator, { clearProps: "transform" });
    if (!animate || reduceMotion || !indicatorPositionedRef.current) {
      gsap.set(indicator, target);
    } else {
      gsap.to(indicator, {
        ...target,
        duration: 0.28,
        ease: "power2.out",
        overwrite: true,
      });
    }
    indicatorPositionedRef.current = true;
  }, [reduceMotion, tabListElement]);

  useLayoutEffect(() => {
    if (activeTaskId !== null) {
      indicatorPositionedRef.current = false;
      return;
    }
    syncTabIndicator(true);
  }, [activeTab, activeTaskId, locale, syncTabIndicator, tabListElement]);

  useLayoutEffect(() => {
    if (activeTaskId !== null) return;
    if (!tabListElement) return;
    const observer = new ResizeObserver(() => syncTabIndicator(false));
    observer.observe(tabListElement);
    tabButtonRefs.current.forEach((button) => {
      if (button) observer.observe(button);
    });
    return () => observer.disconnect();
  }, [activeTaskId, locale, syncTabIndicator, tabListElement]);

  useEffect(() => () => {
    if (tabIndicatorRef.current) gsap.killTweensOf(tabIndicatorRef.current);
  }, []);

  useEffect(() => () => {
    attachmentUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    attachmentUrlsRef.current.clear();
  }, []);

  useEffect(() => {
    setMessage("");
    planPromptRef.current = defaultPlanPrompt;
    savedPlanEditorHtmlRef.current = defaultPlanEditorHtml;
    if (planEditorRef.current) {
      planEditorRef.current.innerHTML = defaultPlanEditorHtml;
      planEditorRef.current.dataset.empty = "false";
    }
    setAttachments((current) => {
      current.forEach((attachment) => {
        if (attachment.previewUrl) {
          URL.revokeObjectURL(attachment.previewUrl);
          attachmentUrlsRef.current.delete(attachment.previewUrl);
        }
      });
      return [];
    });
    setAttachmentMenuOpen(false);
    setProfileMenuOpen(false);
    setProjectMenuOpen(false);
  }, [newTaskKey]);

  useEffect(() => {
    if (!profileMenuOpen && !projectMenuOpen && !attachmentMenuOpen) return;
    const dismissSelectMenus = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!profileMenuRef.current?.contains(target)) setProfileMenuOpen(false);
      if (!projectMenuRef.current?.contains(target)) setProjectMenuOpen(false);
      if (!attachmentMenuRef.current?.contains(target)) setAttachmentMenuOpen(false);
    };
    const dismissSelectMenusOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setProfileMenuOpen(false);
        setProjectMenuOpen(false);
        setAttachmentMenuOpen(false);
      }
    };
    document.addEventListener("pointerdown", dismissSelectMenus);
    document.addEventListener("keydown", dismissSelectMenusOnEscape);
    return () => {
      document.removeEventListener("pointerdown", dismissSelectMenus);
      document.removeEventListener("keydown", dismissSelectMenusOnEscape);
    };
  }, [attachmentMenuOpen, profileMenuOpen, projectMenuOpen]);

  const createTask = (taskMessage: string, sourceTab: number) => {
    const title = Array.from(taskMessage).slice(0, 10).join("");
    const taskAttachments = sourceTab === 0 || sourceTab === 2
      ? attachments.map(({ name, previewUrl }) => ({ name, previewUrl }))
      : undefined;
    onCreateTask?.({
      title,
      projectId: selectedProject?.id ?? null,
      prompt: taskMessage,
      attachments: taskAttachments,
      workflow: sourceTab === 0 ? "new-product" : sourceTab === 2 && inspirationDesignType === "apparel" ? "apparel" : sourceTab === 3 ? "plan" : "default",
    });
    if (sourceTab !== 0 && sourceTab !== 2) attachments.forEach((attachment) => {
      if (attachment.previewUrl) {
        URL.revokeObjectURL(attachment.previewUrl);
        attachmentUrlsRef.current.delete(attachment.previewUrl);
      }
    });
    setAttachments([]);
  };

  const send = () => {
    const taskMessage = message.trim();
    if (!taskMessage) return;
    createTask(taskMessage, activeTab);
    setMessage("");
  };

  const sendPlan = () => {
    const taskMessage = planPromptRef.current.trim();
    if (!taskMessage) return;
    createTask(taskMessage, 3);
    planPromptRef.current = "";
  };

  const addAttachments = (event: ChangeEvent<HTMLInputElement>, kind: Attachment["kind"]) => {
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
      } satisfies Attachment;
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

  const onComposerKeyDown = (event: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    if (event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229) return;
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      send();
    }
  };

  const selectPlanEditorContext = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key.toLowerCase() !== "a" || (!event.metaKey && !event.ctrlKey) || event.altKey) return;

    const editor = event.currentTarget;
    const selection = window.getSelection();
    const anchorNode = selection?.anchorNode;
    if (!selection || !anchorNode || !editor.contains(anchorNode)) return;

    const semanticSlot = activePlanSlotRef.current;
    const selectionTarget = semanticSlot && editor.contains(semanticSlot) ? semanticSlot : editor;
    const range = document.createRange();
    range.selectNodeContents(selectionTarget);
    selection.removeAllRanges();
    selection.addRange(range);
    event.preventDefault();
  };

  return (
    <Suspense fallback={<main className="workspace-region" aria-busy="true" />}>
    <AnimatePresence mode="wait" initial={false}>
    {activeTask ? (
      activeTask.workflow === "new-product" ? (
        <NewProductPlanningWorkspace key={`new-product-conversation-${activeTask.id}`} prompt={activeTask.prompt} profileName={activeTask.profileName} attachments={activeTask.attachments} initialState={activeTask.initialState} />
      ) : activeTask.workflow === "apparel" ? (
        <ClothingConversationWorkspace key={`apparel-conversation-${activeTask.id}`} prompt={activeTask.prompt} attachments={activeTask.attachments} />
      ) : activeTask.workflow === "plan" ? (
        <PlanConversationWorkspace key={`plan-conversation-${activeTask.id}`} prompt={activeTask.prompt} />
      ) : (
        <ConversationWorkspace key={`conversation-${activeTask.id}`} prompt={activeTask.prompt} profileName={activeTask.profileName} initialState={activeTask.initialState} />
      )
    ) : (
    <motion.main
      className="workspace-region"
      key="workspace-home"
      exit={reduceMotion ? undefined : { opacity: 0, y: -12, scale: 0.99 }}
      transition={{ duration: reduceMotion ? 0 : 0.28, ease: [0.22, 1, 0.36, 1] }}
    >
      <motion.div
        className="workspace-shell"
        data-node-id="140:6876"
        variants={primaryPageEntrance}
        initial={reduceMotion ? false : "hidden"}
        animate="visible"
      >
        <motion.section className="workspace-header" data-node-id="163:984" variants={primaryPageEntranceMediaItem}>
          <div className="workspace-copy">
            <h1>{t("今天想从哪里开始？")}</h1>
            <p>{t("选择一个业务场景，描述你的目标，Agent 会带你完成后续步骤。")}</p>
          </div>

          <div className="mode-tabs" role="tablist" aria-label={t("业务场景")} ref={setTabListElement}>
            <span
              ref={tabIndicatorRef}
              className="mode-tabs__indicator"
              aria-hidden="true"
            />
            {tabs.map((tab, index) => (
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === index}
                className={activeTab === index ? "is-active" : ""}
                onClick={() => {
                  setActiveTab(index);
                  setProfileMenuOpen(false);
                  setProjectMenuOpen(false);
                  setAttachmentMenuOpen(false);
                }}
                ref={(node) => { tabButtonRefs.current[index] = node; }}
                key={tab}
              >
                <span>{t(tab)}</span>
              </button>
            ))}
          </div>

          <ArchiveHeaderMotion theme={theme} />
        </motion.section>

        <motion.section className="composer" aria-label={t("新建任务")} data-node-id="140:6883" variants={primaryPageEntranceItem} style={{ height: composerInputHeight + 48 }}>
          <div className={`composer__input ${activeTab !== 3 && attachments.length ? "has-attachments" : ""}`} data-node-id="457:95352" style={{ height: composerInputHeight }}>
            <div className="composer__content">
              <AnimatePresence initial={false}>
                {activeTab !== 3 && attachments.length > 0 && (
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
                          <img className="composer-attachment-chip__file" src={assetUrl("assets/figma-icons/file-pdf.svg")} alt="" />
                        )}
                        <span title={attachment.name}>{attachment.name}</span>
                        <button type="button" aria-label={`${t("移除附件")}：${attachment.name}`} onClick={() => removeAttachment(attachment.id)}>
                          <FigmaIcon name="close" size={16} />
                        </button>
                      </motion.span>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
              <AnimatePresence mode="wait" initial={false}>
              {activeTab === 3 ? (
                <motion.div
                  key="plan-editor"
                  ref={setPlanEditorElement}
                  className="composer-plan-editor"
                  initial={reduceMotion ? false : { opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
                  transition={{ duration: reduceMotion ? 0 : 0.16, ease: "easeOut" }}
                  contentEditable
                  suppressContentEditableWarning
                  role="textbox"
                  aria-label="描述企划案的主题、目标和交付要求..."
                  aria-multiline="true"
                  data-placeholder="描述企划案的主题、目标和交付要求..."
                  data-empty="false"
                  onPointerDown={(event) => {
                    activePlanSlotRef.current = (event.target as HTMLElement).closest<HTMLElement>(".composer-semantic-slot");
                  }}
                  onPointerUp={(event) => {
                    activePlanSlotRef.current = (event.target as HTMLElement).closest<HTMLElement>(".composer-semantic-slot");
                  }}
                  onClick={(event) => {
                    activePlanSlotRef.current = (event.target as HTMLElement).closest<HTMLElement>(".composer-semantic-slot");
                  }}
                  onInput={(event) => {
                    const isComposing = (event.nativeEvent as InputEvent).isComposing;
                    if (!isComposing) normalizePlanEditorMarkup(event.currentTarget);
                    syncPlanEditorValue(event.currentTarget, !isComposing);
                  }}
                  onCompositionEnd={(event) => {
                    normalizePlanEditorMarkup(event.currentTarget);
                    syncPlanEditorValue(event.currentTarget, true);
                  }}
                  onKeyDown={(event) => {
                    if (event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229) return;
                    const activeSemanticSlot = semanticSlotFromNode(window.getSelection()?.anchorNode ?? null) ?? activePlanSlotRef.current;
                    if (event.key === "Backspace" || event.key === "Delete") {
                      const selection = window.getSelection();
                      const range = selection?.rangeCount ? selection.getRangeAt(0) : null;
                      const startSlot = semanticSlotFromNode(range?.startContainer ?? null);
                      const endSlot = semanticSlotFromNode(range?.endContainer ?? null);
                      if (selection && range && !range.collapsed && startSlot && startSlot === endSlot) {
                        const slotTextLength = startSlot.textContent?.length ?? 0;
                        if (range.toString().length >= slotTextLength) {
                          event.preventDefault();
                          startSlot.replaceChildren();
                          const caret = document.createRange();
                          caret.setStart(startSlot, 0);
                          caret.collapse(true);
                          selection.removeAllRanges();
                          selection.addRange(caret);
                          syncPlanEditorValue(event.currentTarget);
                          return;
                        }
                      }

                      const semanticSlot = semanticSlotFromNode(selection?.anchorNode ?? null);
                      if (selection?.isCollapsed && semanticSlot && !semanticSlot.textContent) {
                        event.preventDefault();
                        const parent = semanticSlot.parentNode;
                        const slotIndex = parent ? Array.prototype.indexOf.call(parent.childNodes, semanticSlot) : -1;
                        semanticSlot.remove();
                        if (parent && slotIndex >= 0) {
                          const caret = document.createRange();
                          caret.setStart(parent, slotIndex);
                          caret.collapse(true);
                          selection.removeAllRanges();
                          selection.addRange(caret);
                        }
                        syncPlanEditorValue(event.currentTarget, true);
                        return;
                      }
                    }
                    selectPlanEditorContext(event);
                    if (event.defaultPrevented) return;
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      if (activeSemanticSlot && event.currentTarget.contains(activeSemanticSlot)) return;
                      sendPlan();
                    }
                  }}
                />
              ) : (
              <motion.div
                key="standard-editor"
                className="composer__text-wrap"
                initial={reduceMotion ? false : { opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
                transition={{ duration: reduceMotion ? 0 : 0.16, ease: "easeOut" }}
              >
                <AnimatePresence mode="wait" initial={false}>
                  {!message && (
                    <motion.span
                      className="composer__placeholder"
                      key={`${activeTab}-${activeTab === 2 ? inspirationDesignType : "default"}`}
                      initial={reduceMotion ? false : { opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
                      transition={{ duration: reduceMotion ? 0 : 0.16, ease: "easeOut" }}
                      aria-hidden="true"
                    >
                      {t(activeTab === 2 && inspirationDesignType === "pattern" ? "描述想要生成的图案风格、元素和应用场景..." : composerPlaceholders[activeTab])}
                    </motion.span>
                  )}
                </AnimatePresence>
                <textarea
                  ref={composerTextareaRef}
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  onKeyDown={onComposerKeyDown}
                  placeholder=""
                  aria-label={t(activeTab === 2 && inspirationDesignType === "pattern" ? "描述想要生成的图案风格、元素和应用场景..." : composerPlaceholders[activeTab])}
                />
              </motion.div>
              )}
              </AnimatePresence>
            </div>
            {activeTab !== 3 && <div className="composer-attachment" ref={attachmentMenuRef}>
              <IconControl
                className="composer-attachment__button"
                label={t("添加附件")}
                tooltipPlacement="top"
                selected={attachmentMenuOpen}
                aria-haspopup="menu"
                aria-expanded={attachmentMenuOpen}
                onClick={() => {
                  setAttachmentMenuOpen((open) => !open);
                  setProfileMenuOpen(false);
                  setProjectMenuOpen(false);
                }}
              >
                <FigmaIcon name="plus" size={20} />
              </IconControl>
              <AnimatePresence>
                {attachmentMenuOpen && (
                  <motion.div
                    className="composer-attachment-menu"
                    role="menu"
                    aria-label={t("添加附件")}
                    data-node-id="453:94648"
                    initial={reduceMotion ? false : { opacity: 0, y: 8, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 6, scale: 0.98 }}
                    transition={{ duration: reduceMotion ? 0 : 0.2, ease: "easeOut" }}
                  >
                    <button type="button" role="menuitem" onClick={() => { setAttachmentMenuOpen(false); fileInputRef.current?.click(); }}>
                      <FigmaIcon name="add-file" size={16} />
                      <span>{t("文件")}</span>
                    </button>
                    <button type="button" role="menuitem" onClick={() => { setAttachmentMenuOpen(false); imageInputRef.current?.click(); }}>
                      <FigmaIcon name="add-image" size={16} />
                      <span>{t("图片")}</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
              <input ref={fileInputRef} className="composer-attachment__input" type="file" multiple onChange={(event) => addAttachments(event, "file")} />
              <input ref={imageInputRef} className="composer-attachment__input" type="file" accept="image/*" multiple onChange={(event) => addAttachments(event, "image")} />
            </div>}
            <div className="composer__send-hint" title={t("Enter 发送 · Shift + Enter 换行")}>{t("Enter 发送 · Shift + Enter 换行")}</div>
            <IconControl
              className="composer__send"
              label={t("发送")}
              tooltipPlacement="top"
              disabled={activeTab === 3 ? !planPromptRef.current.trim() : !message.trim()}
              onClick={activeTab === 3 ? sendPlan : send}
            >
              <FigmaIcon name="arrow-up" size={24} />
            </IconControl>
          </div>
          <div className="composer__footer">
            {activeTab !== 3 && <div className="composer-profile-select" ref={profileMenuRef}>
              <button
                type="button"
                className={`composer-select composer-select--profile ${profileMenuOpen ? "is-open" : ""}`}
                aria-haspopup="listbox"
                aria-expanded={profileMenuOpen}
                onClick={() => {
                  setProfileMenuOpen((open) => !open);
                  setProjectMenuOpen(false);
                  setAttachmentMenuOpen(false);
                }}
              >
                <FigmaIcon name={activeTab === 2 ? inspirationDesign.icon : "company-info"} size={16} />
                <span title={activeTab === 2 ? t(inspirationDesign.label) : selectedProfile?.name ?? t("业务偏好档案")}>
                  {activeTab === 2 ? t(inspirationDesign.label) : selectedProfile?.name ?? t("业务偏好档案")}
                </span>
                <FigmaIcon name="chevron-right" size={16} className="composer-select__chevron" />
              </button>
              <AnimatePresence>
                {profileMenuOpen && (
                  <motion.div
                    className={`composer-profile-menu ${activeTab === 2 ? "composer-profile-menu--design" : ""}`.trim()}
                    role="listbox"
                    aria-label={t(activeTab === 2 ? "选择设计类型" : "选择业务偏好档案")}
                    data-node-id="453:93991"
                    initial={reduceMotion ? false : { opacity: 0, y: -6, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -4, scale: 0.98 }}
                    transition={{ duration: reduceMotion ? 0 : 0.2, ease: "easeOut" }}
                  >
                    {activeTab !== 2 && <span className="composer-profile-menu__label">{t("选择业务偏好档案")}</span>}
                    <div className="composer-profile-menu__options">
                      {activeTab === 2 ? inspirationDesignOptions.map((option) => (
                        <button
                          type="button"
                          role="option"
                          aria-selected={inspirationDesignType === option.value}
                          key={option.value}
                          onClick={() => {
                            setInspirationDesignType(option.value);
                            setProfileMenuOpen(false);
                          }}
                        >
                          <FigmaIcon name={option.icon} size={16} />
                          <span>{t(option.label)}</span>
                        </button>
                      )) : profileOptions.map((profile) => {
                        const selected = selectedProfile?.id === profile.id;
                        return (
                          <button
                            type="button"
                            role="option"
                            aria-selected={selected}
                            className={selected ? "is-selected" : ""}
                            key={profile.id}
                            onClick={() => {
                              onSelectedProfileChange?.(selected ? null : profile);
                              setProfileMenuOpen(false);
                            }}
                          >
                            <span>{profile.name}</span>
                            {selected && <FigmaIcon name="check" size={16} />}
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>}
            <div className="composer-project-select" ref={projectMenuRef}>
              <button
                type="button"
                className={`composer-select composer-select--project ${projectMenuOpen ? "is-open" : ""}`}
                aria-haspopup="listbox"
                aria-expanded={projectMenuOpen}
                onClick={() => {
                  setProjectMenuOpen((open) => !open);
                  setProfileMenuOpen(false);
                  setAttachmentMenuOpen(false);
                }}
              >
                <FigmaIcon name="project" size={16} />
                <span title={selectedProject?.name ?? t("选择项目")}>{selectedProject?.name ?? t("选择项目")}</span>
                <FigmaIcon name="chevron-right" size={16} className="composer-select__chevron" />
              </button>
              <AnimatePresence>
                {projectMenuOpen && (
                  <motion.div
                    className="composer-profile-menu composer-project-menu"
                    role="listbox"
                    aria-label={t("选择项目")}
                    initial={reduceMotion ? false : { opacity: 0, y: -6, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -4, scale: 0.98 }}
                    transition={{ duration: reduceMotion ? 0 : 0.2, ease: "easeOut" }}
                  >
                    <span className="composer-profile-menu__label">{t("选择项目")}</span>
                    <div className="composer-profile-menu__options composer-project-menu__options">
                      {availableProjectOptions.map((project) => {
                        const selected = selectedProject?.id === project.id;
                        return (
                          <button
                            type="button"
                            role="option"
                            aria-selected={selected}
                            className={selected ? "is-selected" : ""}
                            key={project.id}
                            onClick={() => {
                              onSelectedProjectChange?.(selected ? null : project);
                              setProjectMenuOpen(false);
                            }}
                          >
                            <span>{project.name}</span>
                            {selected && <FigmaIcon name="check" size={16} />}
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.section>

        <motion.section className={`quick-start ${quickStartOpen ? "is-open" : ""}`} variants={primaryPageEntranceItem}>
          <motion.button
            className="quick-start__toggle"
            type="button"
            onClick={() => setQuickStartOpen((value) => !value)}
            aria-expanded={quickStartOpen}
            layout
            transition={quickStartLayoutTransition}
          >
            <motion.span
              className="quick-start__title"
              layout="position"
              transition={quickStartLayoutTransition}
            >
              <FigmaIcon name="idea" size={20} />
              <strong>{t("快速开始")}</strong>
            </motion.span>
            <motion.span
              className="quick-start__hint"
              layout="position"
              transition={quickStartLayoutTransition}
            >
              <span title={t("不知道从何开始？试试这些模板")}>{t("不知道从何开始？试试这些模板")}</span>
              <FigmaIcon
                name="chevron-down"
                size={16}
                className={quickStartOpen ? "" : "is-closed"}
              />
            </motion.span>
          </motion.button>

          <AnimatePresence initial={false}>
            {quickStartOpen && (
              <motion.div
                className="quick-start__grid"
                initial={{ height: 0, opacity: 0, y: -6 }}
                animate={{ height: "auto", opacity: 1, y: 0 }}
                exit={{
                  height: 0,
                  opacity: 0,
                  y: -6,
                  transition: quickStartCollapseTransition,
                }}
                transition={quickStartExpandTransition}
              >
                {quickStartCards.map((card) => (
                  <QuickStartCard
                    title={t(card.title)}
                    description={t(card.description)}
                    images={card.images}
                    key={card.title}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.section>
      </motion.div>
    </motion.main>
    )}
    </AnimatePresence>
    </Suspense>
  );
}
