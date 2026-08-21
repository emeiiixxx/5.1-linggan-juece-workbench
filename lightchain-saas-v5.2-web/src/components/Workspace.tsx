import { Activity, lazy, Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState, type ChangeEvent, type CSSProperties, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { AnimatePresence, motion, useAnimationControls, useReducedMotion } from "motion/react";
import { quickStartCardsByTab, taskWorkflowLabels, type TaskSourceLabel, type TaskWorkflow } from "../data/workspace";
import { assetUrl } from "../utils/assets";
import { fileIconAssetPath } from "../utils/fileIcon";
import { FigmaIcon } from "./FigmaIcon";
import { FeaturedCases, type FeaturedCase } from "./FeaturedCases";
import { ArchiveHeaderMotion } from "./ArchiveHeaderMotion";
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
const PatternConversationWorkspace = lazy(() =>
  import("./PatternConversationWorkspace").then(({ PatternConversationWorkspace }) => ({ default: PatternConversationWorkspace })),
);
const NewProductPlanningWorkspace = lazy(() =>
  import("./NewProductPlanningWorkspace").then(({ NewProductPlanningWorkspace }) => ({ default: NewProductPlanningWorkspace })),
);
const PlanConversationWorkspace = lazy(() =>
  import("./PlanConversationWorkspace").then(({ PlanConversationWorkspace }) => ({ default: PlanConversationWorkspace })),
);

const tabs = ["商品企划", "客户提案", "服装设计", "图案设计"] as const;
const compactEnglishTabs = ["Planning", "Proposal", "Apparel", "Pattern"] as const;
type ProductPlanningType = "new-product" | "plan";
type PendingFeaturedCaseReuse = {
  prompt: string;
  tab: number;
  planningType?: ProductPlanningType;
};
const productPlanningOptions: { value: ProductPlanningType; label: TaskSourceLabel }[] = [
  { value: "new-product", label: "新品企划" },
  { value: "plan", label: "主题企划" },
];
const composerPlaceholders = [
  "描述你想调研的市场、品类或款式方向...",
  "输入客户需求,或上传brief、邮件和会议纪要...",
  "描述想要设计的款式，或上传参考图片...",
  "描述想要生成的图案风格、元素和应用场景...",
];
const featuredCaseBackToTopRevealOffset = 240;
type ProfileOption = { id: number; name: string };
type ProjectOption = { id: number; name: string };
type ComposerMenuOption = { id: number; name: string };
type Attachment = { id: string; name: string; kind: "file" | "image"; previewUrl?: string };
type WorkspaceTask = {
  id: number;
  prompt: string;
  profileName?: string;
  attachments?: { name: string; previewUrl?: string }[];
  workflow: TaskWorkflow;
  initialState?: "default" | "confirmation" | "complete" | "exception";
};
const defaultPlanPrompt = "以 Loro Piana 的 2027春夏 系列做为设计灵感，需要包含 短款外套、衬衫、卫衣、短袖、长裤、短裤 这些品类，生成一份 男装 主题设计企划";
const defaultPlanEditorHtml = '以 <span class="composer-semantic-slot">Loro Piana</span> 的 <span class="composer-semantic-slot">2027春夏</span> 系列做为设计灵感，需要包含 <span class="composer-semantic-slot">短款外套、衬衫、卫衣、短袖、长裤、短裤</span> 这些品类，生成一份 <span class="composer-semantic-slot">男装</span> 主题设计企划';

function TaskConversation({ task, onTaskStatusChange, readOnly = false }: {
  task: WorkspaceTask;
  onTaskStatusChange?: (taskId: number, status: "running" | "completed") => void;
  readOnly?: boolean;
}) {
  const onTaskProgress = () => onTaskStatusChange?.(task.id, "running");
  const onTaskComplete = () => onTaskStatusChange?.(task.id, "completed");
  const initialState = readOnly ? "complete" : task.initialState;
  if (task.workflow === "new-product") {
    return <NewProductPlanningWorkspace prompt={task.prompt} profileName={task.profileName} attachments={task.attachments} initialState={initialState} onTaskProgress={onTaskProgress} onTaskComplete={onTaskComplete} readOnly={readOnly} />;
  }
  if (task.workflow === "apparel") {
    return <ClothingConversationWorkspace prompt={task.prompt} attachments={task.attachments} initialState={initialState === "exception" ? "default" : initialState} onTaskProgress={onTaskProgress} onTaskComplete={onTaskComplete} readOnly={readOnly} />;
  }
  if (task.workflow === "pattern") {
    return <PatternConversationWorkspace prompt={task.prompt} attachments={task.attachments} initialState={initialState === "exception" ? "default" : initialState} onTaskProgress={onTaskProgress} onTaskComplete={onTaskComplete} readOnly={readOnly} />;
  }
  if (task.workflow === "plan") {
    return <PlanConversationWorkspace prompt={task.prompt} initialState={initialState === "exception" ? "default" : initialState} onTaskComplete={onTaskComplete} readOnly={readOnly} />;
  }
  return <ConversationWorkspace
    prompt={task.prompt}
    profileName={task.profileName}
    attachments={task.attachments}
    initialState={initialState === "complete" ? "complete" : "default"}
    onTaskProgress={onTaskProgress}
    onTaskComplete={onTaskComplete}
    readOnly={readOnly}
  />;
}

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
  { id: 1002, name: "灭霸毁灭世界回忆录" },
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

function ComposerEntityMenu<T extends ComposerMenuOption>({
  label,
  options,
  selectedId,
  createLabel,
  createIcon,
  dataNodeId,
  reduceMotion,
  onSelectionChange,
  onCreate,
  onClose,
}: {
  label: string;
  options: readonly T[];
  selectedId?: number;
  createLabel: string;
  createIcon: string;
  dataNodeId: string;
  reduceMotion: boolean | null;
  onSelectionChange?: (option: T | null) => void;
  onCreate?: () => void;
  onClose: () => void;
}) {
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const selectedIndex = options.findIndex((option) => option.id === selectedId);
    const initialIndex = selectedIndex >= 0 ? selectedIndex : 0;
    optionRefs.current[initialIndex]?.focus();
    return () => previousFocus?.focus();
  }, []);

  const moveOptionFocus = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (!["ArrowDown", "ArrowUp", "Home", "End", "Escape"].includes(event.key)) return;
    event.preventDefault();
    event.stopPropagation();
    if (event.key === "Escape") {
      onClose();
      return;
    }
    const currentIndex = optionRefs.current.findIndex((option) => option === document.activeElement);
    const lastIndex = Math.max(0, options.length - 1);
    const nextIndex = event.key === "Home"
      ? 0
      : event.key === "End"
        ? lastIndex
        : event.key === "ArrowUp"
          ? currentIndex <= 0 ? lastIndex : currentIndex - 1
          : currentIndex >= lastIndex ? 0 : currentIndex + 1;
    optionRefs.current[nextIndex]?.focus();
  };

  return (
    <motion.div
      className="composer-profile-menu"
      role="listbox"
      aria-label={label}
      data-node-id={dataNodeId}
      initial={reduceMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.2, ease: "easeOut" }}
      onKeyDown={moveOptionFocus}
    >
      <span className="composer-profile-menu__label">{label}</span>
      <div className="composer-profile-menu__options composer-profile-menu__scroll-region">
        {options.map((option, index) => {
          const selected = selectedId === option.id;
          return (
            <button
              type="button"
              role="option"
              aria-selected={selected}
              tabIndex={selected || (!options.some((item) => item.id === selectedId) && option === options[0]) ? 0 : -1}
              className={selected ? "is-selected" : ""}
              ref={(node) => { optionRefs.current[index] = node; }}
              key={option.id}
              onClick={() => {
                onSelectionChange?.(selected ? null : option);
                onClose();
              }}
            >
              <span>{option.name}</span>
              {selected && <FigmaIcon name="check" size={16} />}
            </button>
          );
        })}
      </div>
      <div className="composer-profile-menu__footer">
        <button
          type="button"
          className="composer-profile-menu__create"
          onClick={() => {
            onClose();
            onCreate?.();
          }}
        >
          <FigmaIcon name={createIcon} size={20} />
          <span>{createLabel}</span>
        </button>
      </div>
    </motion.div>
  );
}

export function Workspace({ theme, active = true, activeTask, tasks = [], homeEntryKey = 0, onHomeReentry, newTaskKey = 0, newTaskWorkflow = null, selectedProfile, onSelectedProfileChange, onCreateProfile, selectedProject, createdProjects = [], onSelectedProjectChange, onCreateProject, onTaskStatusChange, onCreateTask }: {
  theme: "dark" | "light";
  active?: boolean;
  activeTask?: WorkspaceTask | null;
  tasks?: readonly WorkspaceTask[];
  homeEntryKey?: number;
  onHomeReentry?: () => void;
  newTaskKey?: number;
  newTaskWorkflow?: "new-product" | "default" | null;
  selectedProfile?: ProfileOption | null;
  onSelectedProfileChange?: (profile: ProfileOption | null) => void;
  onCreateProfile?: () => void;
  selectedProject?: ProjectOption | null;
  createdProjects?: readonly ProjectOption[];
  onSelectedProjectChange?: (project: ProjectOption | null) => void;
  onCreateProject?: () => void;
  onTaskStatusChange?: (taskId: number, status: "running" | "completed") => void;
  onCreateTask?: (task: { title: string; projectId: number | null; prompt: string; attachments?: { name: string; previewUrl?: string }[]; workflow: TaskWorkflow; sourceLabel: TaskSourceLabel }) => boolean;
}) {
  const { locale, t } = useI18n();
  const [activeTab, setActiveTab] = useState(0);
  const [productPlanningType, setProductPlanningType] = useState<ProductPlanningType>("new-product");
  const [productPlanningMenuOpen, setProductPlanningMenuOpen] = useState(false);
  const [quickStartOpen, setQuickStartOpen] = useState(true);
  const [selectedFeaturedCase, setSelectedFeaturedCase] = useState<FeaturedCase | null>(null);
  const [showFeaturedCaseBackToTop, setShowFeaturedCaseBackToTop] = useState(false);
  const [pendingFeaturedCaseReuse, setPendingFeaturedCaseReuse] = useState<PendingFeaturedCaseReuse | null>(null);
  const [mountedTaskIds, setMountedTaskIds] = useState<number[]>(() => activeTask ? [activeTask.id] : []);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [projectMenuOpen, setProjectMenuOpen] = useState(false);
  const [attachmentMenuOpen, setAttachmentMenuOpen] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [message, setMessage] = useState("");
  const [attachmentListHeight, setAttachmentListHeight] = useState(0);
  const [productPlanningSelectorOffset, setProductPlanningSelectorOffset] = useState(90);
  const [tabListElement, setTabListElement] = useState<HTMLDivElement | null>(null);
  const { textareaRef: composerTextareaRef, height: composerInputHeight } = useAutoGrowTextarea(message, 160, 280, 64 + attachmentListHeight, true);
  const productPlanningMenuRef = useRef<HTMLDivElement>(null);
  const productPlanningSelectorButtonRef = useRef<HTMLButtonElement>(null);
  const composerAttachmentListRef = useRef<HTMLDivElement>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const projectMenuRef = useRef<HTMLDivElement>(null);
  const attachmentMenuRef = useRef<HTMLDivElement>(null);
  const featuredCasePreviewRef = useRef<HTMLElement>(null);
  const featuredCaseReuseLabelRef = useRef<HTMLSpanElement>(null);
  const planEditorRef = useRef<HTMLDivElement>(null);
  const activePlanSlotRef = useRef<HTMLElement | null>(null);
  const savedPlanEditorHtmlRef = useRef(defaultPlanEditorHtml);
  const planPromptRef = useRef(defaultPlanPrompt);
  const planHasUserDraftRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const attachmentUrlsRef = useRef(new Set<string>());
  const tabIndicatorRef = useRef<HTMLSpanElement>(null);
  const tabButtonRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const indicatorPositionedRef = useRef(false);
  const activeTabRef = useRef(activeTab);
  activeTabRef.current = activeTab;
  const measureFeaturedCaseReuseLabel = useCallback((label: HTMLSpanElement | null) => {
    featuredCaseReuseLabelRef.current = label;
    if (!label) return;

    const updateExpandedWidth = () => {
      if (featuredCaseReuseLabelRef.current !== label) return;
      const button = label.closest<HTMLButtonElement>(".featured-case-preview__reuse");
      if (!button) return;
      // Keep both animation endpoints numeric; Safari cannot interpolate width to max-content.
      const expandedWidth = Math.ceil(label.scrollWidth + 32);
      button.style.setProperty("--featured-case-reuse-expanded-width", `${expandedWidth}px`);
    };

    updateExpandedWidth();
    void document.fonts?.ready.then(updateExpandedWidth);
  }, [locale]);
  const activeTaskId = activeTask?.id ?? null;
  const taskIdsToRender = activeTask && !mountedTaskIds.includes(activeTask.id)
    ? [...mountedTaskIds, activeTask.id]
    : mountedTaskIds;
  const mountedTasks = taskIdsToRender
    .map((taskId) => tasks.find((task) => task.id === taskId))
    .filter((task): task is WorkspaceTask => Boolean(task));
  const isPlanMode = activeTab === 0 && productPlanningType === "plan";
  const supportsProfileSelection = activeTab < 2 && !isPlanMode;
  const activeQuickStartCards = quickStartCardsByTab[activeTab] ?? quickStartCardsByTab[0];
  const reduceMotion = useReducedMotion();
  const homeEntranceControls = useAnimationControls();
  const homeVisible = !activeTask && !selectedFeaturedCase;
  const quickStartExpandTransition = reduceMotion
    ? { duration: 0 }
    : { type: "spring" as const, duration: 0.5, bounce: 0.24 };
  const quickStartCollapseTransition = reduceMotion
    ? { duration: 0 }
    : { type: "tween" as const, duration: 0.3, ease: "easeOut" as const };
  const quickStartLayoutTransition = quickStartOpen
    ? quickStartExpandTransition
    : quickStartCollapseTransition;
  const availableProjectOptions = [
    ...createdProjects,
    ...(selectedProject && !createdProjects.some((project) => project.id === selectedProject.id)
      && !projectOptions.some((project) => project.id === selectedProject.id)
      ? [selectedProject]
      : []),
    ...projectOptions,
  ].filter((project, index, projects) =>
    projects.findIndex((candidate) => candidate.id === project.id) === index,
  );
  const setPlanEditorElement = useCallback((node: HTMLDivElement | null) => {
    planEditorRef.current = node;
    if (node) {
      node.innerHTML = savedPlanEditorHtmlRef.current;
      node.dataset.empty = String(!planPromptRef.current.trim());
    }
  }, []);

  useLayoutEffect(() => {
    if (activeTab !== 0) return;
    const selector = productPlanningSelectorButtonRef.current;
    if (!selector) return;
    const nextOffset = Math.ceil(selector.getBoundingClientRect().width) + 4;
    setProductPlanningSelectorOffset((current) => current === nextOffset ? current : nextOffset);
  }, [activeTab, locale, productPlanningType]);

  useLayoutEffect(() => {
    const attachmentList = composerAttachmentListRef.current;
    if (!attachmentList || !attachments.length || isPlanMode) {
      setAttachmentListHeight((current) => current === 0 ? current : 0);
      return;
    }

    const measureAttachmentList = () => {
      const maxHeight = Number.parseFloat(window.getComputedStyle(attachmentList).maxHeight);
      const measuredHeight = Number.isFinite(maxHeight)
        ? Math.min(attachmentList.scrollHeight, maxHeight)
        : attachmentList.scrollHeight;
      const nextHeight = Math.ceil(measuredHeight);
      setAttachmentListHeight((current) => current === nextHeight ? current : nextHeight);
    };

    measureAttachmentList();
    const observer = new ResizeObserver(measureAttachmentList);
    observer.observe(attachmentList);
    return () => observer.disconnect();
  }, [attachments.length, isPlanMode]);

  const syncPlanEditorValue = (editor: HTMLDivElement, normalizeEmptyMarkup = false) => {
    const nextPrompt = editor.innerText.replace(/\u00a0/g, " ");
    planPromptRef.current = nextPrompt;
    if (!nextPrompt.trim()) planHasUserDraftRef.current = false;
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
    setSelectedFeaturedCase(null);
    setMessage("");
    setActiveTab(newTaskWorkflow === "default" ? 1 : 0);
    setProductPlanningType("new-product");
    setProductPlanningMenuOpen(false);
    planPromptRef.current = defaultPlanPrompt;
    savedPlanEditorHtmlRef.current = defaultPlanEditorHtml;
    planHasUserDraftRef.current = false;
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
  }, [newTaskKey, newTaskWorkflow]);

  useEffect(() => {
    if (activeTask) setSelectedFeaturedCase(null);
  }, [activeTask]);

  useEffect(() => {
    if (!activeTask) return;
    setMountedTaskIds((current) => current.includes(activeTask.id) ? current : [...current, activeTask.id]);
  }, [activeTask]);

  useEffect(() => {
    if (!homeVisible) return;
    if (reduceMotion) {
      homeEntranceControls.set("visible");
      return;
    }
    homeEntranceControls.set("hidden");
    const animationFrame = window.requestAnimationFrame(() => {
      void homeEntranceControls.start("visible");
    });
    return () => window.cancelAnimationFrame(animationFrame);
  }, [homeEntryKey, homeEntranceControls, homeVisible, reduceMotion]);

  const returnFromFeaturedCase = () => {
    setSelectedFeaturedCase(null);
    onHomeReentry?.();
  };

  useEffect(() => {
    if (active) return;
    setProductPlanningMenuOpen(false);
    setProfileMenuOpen(false);
    setProjectMenuOpen(false);
    setAttachmentMenuOpen(false);
  }, [active]);

  useEffect(() => {
    if (!isPlanMode) return;
    setProfileMenuOpen(false);
    onSelectedProfileChange?.(null);
  }, [isPlanMode, onSelectedProfileChange]);

  useEffect(() => {
    setProductPlanningMenuOpen(false);
    setProfileMenuOpen(false);
    setProjectMenuOpen(false);
    setAttachmentMenuOpen(false);
  }, [activeTask?.id]);

  useEffect(() => {
    if (!profileMenuOpen && !projectMenuOpen && !attachmentMenuOpen && !productPlanningMenuOpen) return;
    const dismissSelectMenus = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!productPlanningMenuRef.current?.contains(target)) setProductPlanningMenuOpen(false);
      if (!profileMenuRef.current?.contains(target)) setProfileMenuOpen(false);
      if (!projectMenuRef.current?.contains(target)) setProjectMenuOpen(false);
      if (!attachmentMenuRef.current?.contains(target)) setAttachmentMenuOpen(false);
    };
    const dismissSelectMenusOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setProductPlanningMenuOpen(false);
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
  }, [attachmentMenuOpen, productPlanningMenuOpen, profileMenuOpen, projectMenuOpen]);

  const createTask = (taskMessage: string, sourceTab: number) => {
    const title = Array.from(taskMessage).slice(0, 10).join("");
    const workflow: TaskWorkflow = sourceTab === 0
      ? productPlanningType
      : sourceTab === 1
        ? "default"
        : sourceTab === 2
          ? "apparel"
          : "pattern";
    const taskAttachments = workflow !== "plan"
      ? attachments.map(({ name, previewUrl }) => ({ name, previewUrl }))
      : undefined;
    const created = onCreateTask?.({
      title,
      projectId: selectedProject?.id ?? null,
      prompt: taskMessage,
      attachments: taskAttachments,
      workflow,
      sourceLabel: taskWorkflowLabels[workflow],
    }) ?? false;
    if (!created) return false;
    if (workflow === "plan") attachments.forEach((attachment) => {
      if (attachment.previewUrl) {
        URL.revokeObjectURL(attachment.previewUrl);
        attachmentUrlsRef.current.delete(attachment.previewUrl);
      }
    });
    setAttachments([]);
    return true;
  };

  const send = () => {
    const taskMessage = message.trim();
    if (!taskMessage) return;
    if (createTask(taskMessage, activeTab)) setMessage("");
  };

  const sendPlan = () => {
    const taskMessage = planPromptRef.current.trim();
    if (!taskMessage) return;
    if (createTask(taskMessage, 0)) planPromptRef.current = "";
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
    if (
      event.key === "Backspace"
      && !message
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
      send();
    }
  };

  const fillComposerDraft = (text: string, targetTab = activeTab, targetPlanningType?: ProductPlanningType) => {
    const shouldFillPlan = targetTab === 0
      && (targetPlanningType ?? productPlanningType) === "plan";

    if (targetTab !== activeTab) {
      setActiveTab(targetTab);
      onSelectedProfileChange?.(null);
    }

    if (targetTab === 0 && targetPlanningType) {
      setProductPlanningType(targetPlanningType);
      setProductPlanningMenuOpen(false);
    }

    if (!shouldFillPlan) {
      setMessage(text);
      window.requestAnimationFrame(() => {
        const textarea = composerTextareaRef.current;
        if (!textarea) return;
        textarea.focus();
        textarea.setSelectionRange(text.length, text.length);
      });
      return;
    }

    setMessage("");
    planPromptRef.current = text;
    planHasUserDraftRef.current = true;
    savedPlanEditorHtmlRef.current = text;
    window.requestAnimationFrame(() => {
      const editor = planEditorRef.current;
      if (!editor) return;
      editor.textContent = text;
      editor.dataset.empty = "false";
      syncPlanEditorValue(editor);
      editor.focus();
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(editor);
      range.collapse(false);
      selection?.removeAllRanges();
      selection?.addRange(range);
    });
  };

  const reuseFeaturedCasePrompt = () => {
    if (!selectedFeaturedCase) return;

    const target = selectedFeaturedCase.workflow === "new-product"
      ? { tab: 0, planningType: "new-product" as const }
      : selectedFeaturedCase.workflow === "plan"
        ? { tab: 0, planningType: "plan" as const }
        : selectedFeaturedCase.workflow === "default"
          ? { tab: 1 }
          : selectedFeaturedCase.workflow === "apparel"
            ? { tab: 2 }
            : { tab: 3 };

    const prompt = selectedFeaturedCase.prompt;
    setPendingFeaturedCaseReuse({
      prompt,
      tab: target.tab,
      planningType: "planningType" in target ? target.planningType : undefined,
    });
    setSelectedFeaturedCase(null);
    setProductPlanningMenuOpen(false);
    setProfileMenuOpen(false);
    setProjectMenuOpen(false);
    setAttachmentMenuOpen(false);
    onHomeReentry?.();
  };

  const scrollFeaturedCaseToTop = () => {
    const conversationScroll = featuredCasePreviewRef.current?.querySelector<HTMLElement>(".conversation-scroll");
    if (!conversationScroll) return;

    conversationScroll.scrollTo({
      top: 0,
      behavior: reduceMotion ? "auto" : "smooth",
    });
  };

  const updateFeaturedCaseBackToTopVisibility = (scrollTop: number) => {
    setShowFeaturedCaseBackToTop((visible) => {
      if (scrollTop <= 8) return false;
      if (scrollTop > featuredCaseBackToTopRevealOffset) return true;
      return visible;
    });
  };

  const trackFeaturedCaseScroll = (target: EventTarget | null) => {
    if (!(target instanceof HTMLElement) || !target.classList.contains("conversation-scroll")) return;
    updateFeaturedCaseBackToTopVisibility(target.scrollTop);
  };

  useEffect(() => {
    if (!selectedFeaturedCase) {
      setShowFeaturedCaseBackToTop(false);
      return;
    }

    let frame = 0;
    let observer: MutationObserver | null = null;
    const syncInitialPosition = () => {
      const conversationScroll = featuredCasePreviewRef.current?.querySelector<HTMLElement>(".conversation-scroll");
      if (!conversationScroll) return;
      updateFeaturedCaseBackToTopVisibility(conversationScroll.scrollTop);
      observer?.disconnect();
    };
    const scheduleSync = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(syncInitialPosition);
    };

    scheduleSync();
    if (featuredCasePreviewRef.current) {
      observer = new MutationObserver(scheduleSync);
      observer.observe(featuredCasePreviewRef.current, { childList: true, subtree: true });
    }

    return () => {
      window.cancelAnimationFrame(frame);
      observer?.disconnect();
    };
  }, [selectedFeaturedCase]);

  useEffect(() => {
    if (!pendingFeaturedCaseReuse || selectedFeaturedCase || activeTask) return;

    const draft = pendingFeaturedCaseReuse;
    setPendingFeaturedCaseReuse(null);
    fillComposerDraft(draft.prompt, draft.tab, draft.planningType);
  }, [activeTask, pendingFeaturedCaseReuse, selectedFeaturedCase]);

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
    {mountedTasks.map((task) => (
      <div className="workspace-task-cache" hidden={activeTaskId !== task.id} key={task.id}>
        <TaskConversation task={task} onTaskStatusChange={onTaskStatusChange} />
      </div>
    ))}
    <Activity mode={!activeTask && selectedFeaturedCase ? "visible" : "hidden"} name="featured-case-preview">
      {selectedFeaturedCase ? (
        <section
          ref={featuredCasePreviewRef}
          className="featured-case-preview"
          aria-label={`${t("只读案例")}：${t(selectedFeaturedCase.title)}`}
          onScrollCapture={(event) => trackFeaturedCaseScroll(event.target)}
        >
          <div className="featured-case-preview__nav-region" data-node-id="804:49808">
            <header className="featured-case-preview__header" data-node-id="804:49809">
              <button type="button" className="featured-case-preview__back" onClick={returnFromFeaturedCase}>
                <FigmaIcon name="arrow-left" size={16} />
                <span>{t("返回")}</span>
              </button>
              <strong>{t(selectedFeaturedCase.title)}</strong>
              <span className="task-list-item-content__type">{t(taskWorkflowLabels[selectedFeaturedCase.workflow])}</span>
              <span className="featured-case-preview__badge">{t("只读案例")}</span>
            </header>
          </div>
          <div className="featured-case-preview__content">
            <TaskConversation
              task={{
                id: -9000 - activeTab,
                prompt: selectedFeaturedCase.prompt,
                workflow: selectedFeaturedCase.workflow,
                initialState: "complete",
              }}
              readOnly
            />
          </div>
          <div className="featured-case-preview__action-region">
            <div className="featured-case-preview__action-controls">
              <AnimatePresence initial={false}>
                {showFeaturedCaseBackToTop && (
                  <motion.div
                    className="featured-case-preview__back-to-top-wrap"
                    initial={reduceMotion ? false : { opacity: 0, y: 4, scale: 0.94 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 4, scale: 0.94 }}
                    transition={{ duration: reduceMotion ? 0 : 0.16, ease: "easeOut" }}
                  >
                    <IconControl
                      className="featured-case-preview__back-to-top"
                      data-node-id="831:50977"
                      label={t("返回顶部")}
                      size="large"
                      tooltipPlacement="left"
                      onClick={scrollFeaturedCaseToTop}
                    >
                      <FigmaIcon name="pin" size={24} />
                    </IconControl>
                  </motion.div>
                )}
              </AnimatePresence>
              <button
                type="button"
                className="profile-button profile-button--primary featured-case-preview__reuse"
                aria-label={t("复制初始输入到新建任务")}
                data-node-id="831:50960"
                onClick={reuseFeaturedCasePrompt}
              >
                <span className="featured-case-preview__reuse-icon" data-node-id="831:50946">
                  <FigmaIcon name="copy" size={24} />
                </span>
                <span ref={measureFeaturedCaseReuseLabel} className="featured-case-preview__reuse-label" data-node-id="831:50940">
                  {t("复制初始输入到新建任务")}
                </span>
              </button>
            </div>
          </div>
        </section>
      ) : null}
    </Activity>
    <Activity mode={activeTask || selectedFeaturedCase ? "hidden" : "visible"} name="workspace-home">
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
        animate={homeEntranceControls}
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
                  if (index !== activeTab) onSelectedProfileChange?.(null);
                  setActiveTab(index);
                  setProductPlanningMenuOpen(false);
                  setProfileMenuOpen(false);
                  setProjectMenuOpen(false);
                  setAttachmentMenuOpen(false);
                }}
                ref={(node) => { tabButtonRefs.current[index] = node; }}
                key={tab}
              >
                <span>{locale === "en-US" ? compactEnglishTabs[index] : t(tab)}</span>
              </button>
            ))}
          </div>

          <ArchiveHeaderMotion theme={theme} activeTab={activeTab} />
        </motion.section>

        <motion.section className="composer" aria-label={t("新建任务")} data-node-id="140:6883" variants={primaryPageEntranceItem} style={{ height: composerInputHeight + 48 }}>
          <div className={`composer__input ${!isPlanMode && attachments.length ? "has-attachments" : ""}`} data-node-id="457:95352" style={{ height: composerInputHeight }}>
            <div className="composer__content">
              <AnimatePresence initial={false}>
                {!isPlanMode && attachments.length > 0 && (
                  <motion.div
                    ref={composerAttachmentListRef}
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
                          aria-label={`${t("移除附件")}：${attachment.name}`}
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
              <div
                className={`composer-editor-stage ${activeTab === 0 ? "has-product-planning-selector" : ""}`}
                ref={activeTab === 0 ? productPlanningMenuRef : undefined}
                style={activeTab === 0 ? {
                  "--composer-task-selector-offset": `${productPlanningSelectorOffset}px`,
                } as CSSProperties : undefined}
              >
                <div className="composer-editor-scroll">
                {activeTab === 0 && (
                  <div className="composer-product-planning-select composer-product-planning-select--inline">
                    <button
                      ref={productPlanningSelectorButtonRef}
                      type="button"
                      className={`composer-task-type-selector ${productPlanningMenuOpen ? "is-open" : ""}`}
                      aria-haspopup="listbox"
                      aria-expanded={productPlanningMenuOpen}
                      aria-controls="composer-product-planning-menu"
                      data-node-id="840:52934"
                      onClick={() => {
                        setProductPlanningMenuOpen((open) => !open);
                        setProfileMenuOpen(false);
                        setProjectMenuOpen(false);
                        setAttachmentMenuOpen(false);
                      }}
                    >
                      <span>{t(productPlanningOptions.find((option) => option.value === productPlanningType)?.label ?? "新品企划")}</span>
                      <FigmaIcon name="chevron-down" size={16} className="composer-task-type-selector__chevron" />
                    </button>
                  </div>
                )}
              <AnimatePresence mode="wait" initial={false}>
              {isPlanMode ? (
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
                  aria-label={t("描述主题企划的主题、目标和交付要求...")}
                  aria-multiline="true"
                  data-placeholder={t("描述主题企划的主题、目标和交付要求...")}
                  data-empty="false"
                  onBeforeInput={(event) => {
                    const inputType = (event.nativeEvent as InputEvent).inputType ?? "";
                    if (inputType.startsWith("insert")) planHasUserDraftRef.current = true;
                  }}
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
                    const nativeEvent = event.nativeEvent as InputEvent;
                    const isComposing = nativeEvent.isComposing;
                    if ((nativeEvent.inputType ?? "").startsWith("insert")) planHasUserDraftRef.current = true;
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
                      key={activeTab}
                      initial={reduceMotion ? false : { opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
                      transition={{ duration: reduceMotion ? 0 : 0.16, ease: "easeOut" }}
                      aria-hidden="true"
                    >
                      {t(composerPlaceholders[activeTab])}
                    </motion.span>
                  )}
                </AnimatePresence>
                <textarea
                  ref={composerTextareaRef}
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  onKeyDown={onComposerKeyDown}
                  placeholder=""
                  aria-label={t(composerPlaceholders[activeTab])}
                />
              </motion.div>
              )}
              </AnimatePresence>
                </div>
                <AnimatePresence>
                  {activeTab === 0 && productPlanningMenuOpen && (
                    <motion.div
                      id="composer-product-planning-menu"
                      className="composer-product-planning-menu composer-product-planning-menu--inline"
                      role="listbox"
                      aria-label={t("选择商品企划类型")}
                      data-node-id="840:54220"
                      initial={reduceMotion ? false : { opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: reduceMotion ? 0 : 0.16, ease: "easeOut" }}
                    >
                      {productPlanningOptions.map((option) => (
                        <button
                          type="button"
                          role="option"
                          aria-selected={productPlanningType === option.value}
                          key={option.value}
                          onClick={() => {
                            if (option.value === "plan" && !planHasUserDraftRef.current) {
                              planPromptRef.current = defaultPlanPrompt;
                              savedPlanEditorHtmlRef.current = defaultPlanEditorHtml;
                            }
                            setProductPlanningType(option.value);
                            setProductPlanningMenuOpen(false);
                          }}
                        >
                          {t(option.label)}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
            {!isPlanMode && <div className="composer-attachment" ref={attachmentMenuRef}>
              <IconControl
                className="composer-attachment__button"
                label={t("添加附件")}
                tooltipPlacement="top"
                selected={attachmentMenuOpen}
                aria-haspopup="menu"
                aria-expanded={attachmentMenuOpen}
                onClick={() => {
                  setAttachmentMenuOpen((open) => !open);
                  setProductPlanningMenuOpen(false);
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
                    initial={reduceMotion ? false : { opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: reduceMotion ? 0 : 0.16, ease: "easeOut" }}
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
              <input ref={fileInputRef} className="composer-attachment__input" type="file" multiple tabIndex={-1} aria-label={t("选择要上传的文件")} onChange={(event) => addAttachments(event, "file")} />
              <input ref={imageInputRef} className="composer-attachment__input" type="file" accept="image/*" multiple tabIndex={-1} aria-label={t("选择要上传的图片")} onChange={(event) => addAttachments(event, "image")} />
            </div>}
            <div className="composer__send-hint" title={t("Enter 发送 · Shift + Enter 换行")}>{t("Enter 发送 · Shift + Enter 换行")}</div>
            <IconControl
              className="composer__send"
              label={t("发送")}
              tooltipPlacement="top"
              disabled={isPlanMode ? !planPromptRef.current.trim() : !message.trim()}
              onClick={isPlanMode ? sendPlan : send}
            >
              <FigmaIcon name="arrow-up" size={24} />
            </IconControl>
          </div>
          <div className="composer__footer">
            {supportsProfileSelection && <div className="composer-profile-select" ref={profileMenuRef}>
              <button
                type="button"
                className={`composer-select composer-select--profile ${profileMenuOpen ? "is-open" : ""}`}
                aria-haspopup="listbox"
                aria-expanded={profileMenuOpen}
                onClick={() => {
                  setProfileMenuOpen((open) => !open);
                  setProductPlanningMenuOpen(false);
                  setProjectMenuOpen(false);
                  setAttachmentMenuOpen(false);
                }}
              >
                <FigmaIcon name="company-info" size={16} />
                <span title={selectedProfile?.name ?? t("业务偏好档案")}>
                  {selectedProfile?.name ?? t("业务偏好档案")}
                </span>
                <FigmaIcon name="chevron-right" size={16} className="composer-select__chevron" />
              </button>
              <AnimatePresence>
                {profileMenuOpen && (
                  <ComposerEntityMenu
                    label={t("选择业务偏好档案")}
                    options={profileOptions}
                    selectedId={selectedProfile?.id}
                    createLabel={t("新建业务偏好档案")}
                    createIcon="plus"
                    dataNodeId="453:93991"
                    reduceMotion={reduceMotion}
                    onSelectionChange={onSelectedProfileChange}
                    onCreate={onCreateProfile}
                    onClose={() => setProfileMenuOpen(false)}
                  />
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
                  setProductPlanningMenuOpen(false);
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
                  <ComposerEntityMenu
                    label={t("选择项目")}
                    options={availableProjectOptions}
                    selectedId={selectedProject?.id}
                    createLabel={t("新建项目")}
                    createIcon="add-project"
                    dataNodeId="453:94442"
                    reduceMotion={reduceMotion}
                    onSelectionChange={onSelectedProjectChange}
                    onCreate={onCreateProject}
                    onClose={() => setProjectMenuOpen(false)}
                  />
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
              <span className="quick-start__hint-icon">
                <FigmaIcon
                  name="chevron-down"
                  size={16}
                  className={quickStartOpen ? "" : "is-closed"}
                />
              </span>
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
                {activeQuickStartCards.map((card, index) => (
                  <QuickStartCard
                    text={t(card.text)}
                    typeLabel={activeTab === 0
                      ? t(taskWorkflowLabels[card.workflow])
                      : undefined}
                    onSelect={(text) => fillComposerDraft(
                      text,
                      activeTab,
                      card.workflow === "new-product" || card.workflow === "plan" ? card.workflow : undefined,
                    )}
                    key={`${card.workflow}-${card.text}-${index}`}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.section>
        <motion.div variants={primaryPageEntranceItem}>
          <FeaturedCases activeTab={activeTab} onSelect={setSelectedFeaturedCase} />
        </motion.div>
      </motion.div>
    </motion.main>
    </Activity>
    </Suspense>
  );
}
