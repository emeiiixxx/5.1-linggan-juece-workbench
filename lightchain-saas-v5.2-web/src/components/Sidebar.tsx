import {
  useEffect,
  useRef,
  useState,
  type DragEvent,
  type KeyboardEvent,
  type MouseEvent,
} from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import {
  allDemoTaskExamples,
  initialTaskSidebarMeta,
  projectGroups,
  recentItems,
  taskItems,
  type TaskSourceLabel,
  type TaskSidebarMeta,
  type TaskStatus,
  type TaskWorkflow,
} from "../data/workspace";
import { FigmaIcon } from "./FigmaIcon";
import { IconControl } from "./IconControl";
import { TaskListItemContent } from "./TaskListItemContent";
import { useI18n } from "../i18n";
import { assetUrl } from "../utils/assets";

type SidebarProps = {
  expanded: boolean;
  onToggle: () => void;
  pageTitle?: string;
  activeView?: "workspace" | "preferences";
  activeTaskId?: number | null;
  onOpenWorkspace?: () => void;
  onOpenPreferences?: () => void;
  onCreateTaskInProject?: (project: { id: number; name: string }) => void;
  createdTask?: {
    id: number;
    title: string;
    projectId: number | null;
    workflow: TaskWorkflow;
    sourceLabel?: TaskSourceLabel;
    status: TaskStatus;
    updatedAt: string;
  } | null;
  taskRecords?: {
    title: string;
    workflow: TaskWorkflow;
    sourceLabel?: TaskSourceLabel;
    status: TaskStatus;
    updatedAt: string;
  }[];
  onOpenTask?: (taskId: number) => void;
  onSelectStaticRow?: () => void;
  onDeleteTask?: (taskId: number) => void;
  onMoveTask?: (taskId: number, projectId: number | null) => void;
  onDeleteProject?: (projectId: number) => void;
};

type ActionTarget =
  | { kind: "group"; groupIndex: number }
  | { kind: "item"; groupIndex: number; itemIndex: number }
  | { kind: "task"; taskIndex: number };

type ActionMenuState = {
  target: ActionTarget;
  left: number;
  top: number;
};

type DialogState = {
  mode: "rename" | "delete";
  target: ActionTarget;
};

type DraggedRow =
  | { kind: "group"; groupIndex: number; label: string }
  | { kind: "item"; groupIndex: number; itemIndex: number; label: string }
  | { kind: "task"; taskIndex: number; label: string };

type DropTarget =
  | { kind: "group"; index: number }
  | { kind: "task"; groupIndex: number | null; index: number };

type DropIndicator = { left: number; top: number; width: number };

type SelectedRow =
  | { kind: "item"; groupId: number; itemIndex: number }
  | { kind: "task"; taskIndex: number };

const PROJECT_TASK_PREVIEW_LIMIT = 5;

function ProjectDisclosureIcon({ expanded }: { expanded: boolean }) {
  return (
    <span className={`project-disclosure-icon ${expanded ? "is-open" : ""}`}>
      <FigmaIcon name="project-closed" size={16} className="project-disclosure-icon__closed" />
      <FigmaIcon name="project-open" size={16} className="project-disclosure-icon__open" />
    </span>
  );
}

export function Sidebar({
  expanded,
  onToggle,
  pageTitle = "灵感决策工作台",
  activeView = "workspace",
  activeTaskId = null,
  onOpenWorkspace,
  onOpenPreferences,
  onCreateTaskInProject,
  createdTask,
  taskRecords = [],
  onOpenTask,
  onSelectStaticRow,
  onDeleteTask,
  onMoveTask,
  onDeleteProject,
}: SidebarProps) {
  const { t } = useI18n();
  const [recentExpanded, setRecentExpanded] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [collapsedMenu, setCollapsedMenu] = useState<"recent" | null>(null);
  const [groups, setGroups] = useState(() =>
    projectGroups.map((group, groupIndex) => ({
      id: groupIndex,
      ...group,
      items: [...group.items],
      expanded: groupIndex === 0 && group.items.length > 0,
      showAll: false,
    })),
  );
  const [tasks, setTasks] = useState(() => [...taskItems]);
  const [selectedRow, setSelectedRow] = useState<SelectedRow | null>(null);
  const [actionMenu, setActionMenu] = useState<ActionMenuState | null>(null);
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [createProjectOpen, setCreateProjectOpen] = useState(false);
  const [createProjectValue, setCreateProjectValue] = useState("");
  const [draggedRow, setDraggedRow] = useState<DraggedRow | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);
  const [dropIndicator, setDropIndicator] = useState<DropIndicator | null>(null);
  const [dropFocusedGroupIndex, setDropFocusedGroupIndex] = useState<number | null>(null);
  const actionMenuRef = useRef<HTMLDivElement>(null);
  const actionMenuAnchorRef = useRef<HTMLButtonElement | null>(null);
  const actionMenuStateRef = useRef<ActionMenuState | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const collapsedRecentTriggerRef = useRef<HTMLDivElement>(null);
  const collapsedMenuCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [collapsedFlyoutMaxHeight, setCollapsedFlyoutMaxHeight] = useState<number>();
  const lastCreatedTaskIdRef = useRef<number | null>(null);
  const createdTaskIdsRef = useRef(new Map<string, number>(
    allDemoTaskExamples.map((task) => [`${task.projectId ?? "task"}:${task.title}`, task.id]),
  ));
  const taskSidebarMetaRef = useRef(new Map<string, TaskSidebarMeta>(
    Object.entries(initialTaskSidebarMeta),
  ));
  const taskRecordMeta = new Map<string, TaskSidebarMeta>(taskRecords.map((task) => [
    task.title,
    { workflow: task.workflow, sourceLabel: task.sourceLabel, status: task.status, updatedAt: task.updatedAt },
  ]));
  const getTaskSidebarMeta = (title: string): TaskSidebarMeta => {
    const recordMeta = taskRecordMeta.get(title);
    if (recordMeta) return recordMeta;
    const existingMeta = taskSidebarMetaRef.current.get(title);
    if (existingMeta) return existingMeta;
    const workflows: TaskWorkflow[] = ["new-product", "default", "apparel", "pattern", "plan"];
    const hash = Array.from(title).reduce((total, character) => total + character.charCodeAt(0), 0);
    return { workflow: workflows[hash % workflows.length], status: "running" };
  };
  const normalizedSearchQuery = searchQuery.trim().toLocaleLowerCase();
  const visibleRecentItems = recentItems
    .filter(([title, meta]) =>
      !normalizedSearchQuery || `${title} ${meta}`.toLocaleLowerCase().includes(normalizedSearchQuery),
    )
    .slice(0, 5);

  useEffect(() => {
    if (!createdTask || lastCreatedTaskIdRef.current === createdTask.id) return;
    const taskKey = `${createdTask.projectId ?? "task"}:${createdTask.title}`;
    if (createdTaskIdsRef.current.get(taskKey) === createdTask.id) {
      lastCreatedTaskIdRef.current = createdTask.id;
      return;
    }
    lastCreatedTaskIdRef.current = createdTask.id;
    createdTaskIdsRef.current.set(taskKey, createdTask.id);
    taskSidebarMetaRef.current.set(createdTask.title, {
      workflow: createdTask.workflow,
      sourceLabel: createdTask.sourceLabel,
      status: createdTask.status,
      updatedAt: createdTask.updatedAt,
    });

    if (createdTask.projectId === null) {
      setTasks((current) => [
        createdTask.title,
        ...current.filter((title) => title !== createdTask.title),
      ]);
      setRecentExpanded(true);
      setSelectedRow({ kind: "task", taskIndex: 0 });
      return;
    }

    const groupIndex = groups.findIndex((group) => group.id === createdTask.projectId);
    if (groupIndex < 0) return;
    setGroups((current) =>
      current.map((group) =>
        group.id === createdTask.projectId
          ? {
              ...group,
              items: [
                createdTask.title,
                ...group.items.filter((title) => title !== createdTask.title),
              ],
              expanded: true,
            }
          : group,
      ),
    );
    setRecentExpanded(true);
    setSelectedRow({ kind: "item", groupId: createdTask.projectId, itemIndex: 0 });
  }, [createdTask]);

  const openNewTask = () => {
    setSelectedRow(null);
    onOpenWorkspace?.();
  };

  const openPreferences = () => {
    setSelectedRow(null);
    onOpenPreferences?.();
  };

  const openSavedTask = (projectId: number | null, title: string) => {
    const taskId = createdTaskIdsRef.current.get(`${projectId ?? "task"}:${title}`);
    if (taskId !== undefined) {
      setSelectedRow(null);
      onOpenTask?.(taskId);
      return;
    }
    onSelectStaticRow?.();
  };

  const openSearchResult = (title: string) => {
    setSearchOpen(false);
    setSearchQuery("");

    const groupIndex = groups.findIndex((group) => group.items.includes(title));
    if (groupIndex >= 0) {
      const group = groups[groupIndex];
      const itemIndex = group.items.indexOf(title);
      setRecentExpanded(true);
      if (!group.expanded) {
        setGroups((current) => current.map((item) =>
          item.id === group.id ? { ...item, expanded: true } : item,
        ));
      }
      setSelectedRow({ kind: "item", groupId: group.id, itemIndex });
      openSavedTask(group.id, title);
      return;
    }

    const taskIndex = tasks.indexOf(title);
    if (taskIndex >= 0) {
      setRecentExpanded(true);
      setSelectedRow({ kind: "task", taskIndex });
      openSavedTask(null, title);
      return;
    }

    const savedTask = allDemoTaskExamples.find((task) => task.title === title);
    if (savedTask) {
      setSelectedRow(null);
      onOpenTask?.(savedTask.id);
      return;
    }

    onSelectStaticRow?.();
  };

  const openCollapsedMenu = (menu: "recent") => {
    if (collapsedMenuCloseTimerRef.current) {
      clearTimeout(collapsedMenuCloseTimerRef.current);
      collapsedMenuCloseTimerRef.current = null;
    }
    const triggerTop = collapsedRecentTriggerRef.current?.getBoundingClientRect().top;
    if (triggerTop !== undefined) {
      setCollapsedFlyoutMaxHeight(Math.max(160, window.innerHeight - triggerTop - 12));
    }
    setCollapsedMenu(menu);
  };

  const scheduleCollapsedMenuClose = () => {
    if (collapsedMenuCloseTimerRef.current) {
      clearTimeout(collapsedMenuCloseTimerRef.current);
    }
    collapsedMenuCloseTimerRef.current = setTimeout(() => {
      if (actionMenuStateRef.current) {
        collapsedMenuCloseTimerRef.current = null;
        return;
      }
      setCollapsedMenu(null);
      collapsedMenuCloseTimerRef.current = null;
    }, 180);
  };

  useEffect(() => {
    actionMenuStateRef.current = actionMenu;
  }, [actionMenu]);

  useEffect(() => {
    if (!actionMenu) return;

    const handlePointerDown = (event: PointerEvent) => {
      const node = event.target as Node;
      if (
        actionMenuRef.current?.contains(node) ||
        actionMenuAnchorRef.current?.contains(node)
      ) {
        return;
      }
      setActionMenu(null);
      if (!expanded) setCollapsedMenu(null);
    };
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        setActionMenu(null);
        if (!expanded) setCollapsedMenu(null);
        actionMenuAnchorRef.current?.focus();
      }
    };
    const handleScroll = () => {
      setActionMenu(null);
      if (!expanded) setCollapsedMenu(null);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("scroll", handleScroll, true);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [actionMenu, expanded]);

  useEffect(() => {
    if (!dialog) return;
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") setDialog(null);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [dialog]);

  useEffect(() => {
    if (!createProjectOpen) return;
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") setCreateProjectOpen(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [createProjectOpen]);

  useEffect(() => {
    if (collapsedMenu !== "recent") return;
    const updateFlyoutMaxHeight = () => {
      const triggerTop = collapsedRecentTriggerRef.current?.getBoundingClientRect().top;
      if (triggerTop !== undefined) {
        setCollapsedFlyoutMaxHeight(Math.max(160, window.innerHeight - triggerTop - 12));
      }
    };
    updateFlyoutMaxHeight();
    window.addEventListener("resize", updateFlyoutMaxHeight);
    return () => window.removeEventListener("resize", updateFlyoutMaxHeight);
  }, [collapsedMenu]);

  useEffect(() => {
    if (!expanded) {
      setActionMenu(null);
      setDraggedRow(null);
      setDropTarget(null);
      setDropIndicator(null);
      setDropFocusedGroupIndex(null);
    }
  }, [expanded]);

  useEffect(
    () => () => {
      if (collapsedMenuCloseTimerRef.current) {
        clearTimeout(collapsedMenuCloseTimerRef.current);
      }
    },
    [],
  );

  const getTargetLabel = (target: ActionTarget) => {
    if (target.kind === "group") return groups[target.groupIndex]?.title ?? "";
    if (target.kind === "item") {
      return groups[target.groupIndex]?.items[target.itemIndex] ?? "";
    }
    return tasks[target.taskIndex] ?? "";
  };

  const openActionMenu = (
    event: MouseEvent<HTMLButtonElement>,
    target: ActionTarget,
  ) => {
    event.stopPropagation();
    const rect = event.currentTarget.getBoundingClientRect();
    const menuWidth = 160;
    const menuHeight = 84;
    const viewportPadding = 8;
    const left = Math.min(rect.left, window.innerWidth - menuWidth - viewportPadding);
    const top =
      rect.bottom + 2 + menuHeight <= window.innerHeight - viewportPadding
        ? rect.bottom + 2
        : rect.top - menuHeight - 2;

    actionMenuAnchorRef.current = event.currentTarget;
    const nextActionMenu = { target, left: Math.max(viewportPadding, left), top };
    actionMenuStateRef.current = nextActionMenu;
    setActionMenu(nextActionMenu);
  };

  const startDialog = (mode: DialogState["mode"]) => {
    if (!actionMenu) return;
    if (mode === "rename") setRenameValue(getTargetLabel(actionMenu.target));
    setDialog({ mode, target: actionMenu.target });
    setActionMenu(null);
    setCollapsedMenu(null);
  };

  const handleActionMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
    const items = Array.from(
      actionMenuRef.current?.querySelectorAll<HTMLButtonElement>("[role='menuitem']") ?? [],
    );
    if (!items.length) return;

    event.preventDefault();
    const currentIndex = items.indexOf(document.activeElement as HTMLButtonElement);
    const nextIndex =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? items.length - 1
          : event.key === "ArrowDown"
            ? (currentIndex + 1) % items.length
            : (currentIndex - 1 + items.length) % items.length;
    items[nextIndex]?.focus();
  };

  const confirmRename = () => {
    if (!dialog || dialog.mode !== "rename") return;
    const nextLabel = renameValue.trim();
    if (!nextLabel) return;
    const target = dialog.target;

    if (target.kind === "task") {
      const taskIndexToRename = target.taskIndex;
      const previousLabel = tasks[taskIndexToRename];
      const previousKey = previousLabel ? `task:${previousLabel}` : null;
      const taskId = previousKey ? createdTaskIdsRef.current.get(previousKey) : undefined;
      if (previousKey && taskId !== undefined) {
        createdTaskIdsRef.current.delete(previousKey);
        createdTaskIdsRef.current.set(`task:${nextLabel}`, taskId);
      }
      const sidebarMeta = previousLabel ? taskSidebarMetaRef.current.get(previousLabel) : undefined;
      if (previousLabel) taskSidebarMetaRef.current.delete(previousLabel);
      if (sidebarMeta) taskSidebarMetaRef.current.set(nextLabel, sidebarMeta);
      setTasks((current) =>
        current.map((task, taskIndex) =>
          taskIndex === taskIndexToRename ? nextLabel : task,
        ),
      );
      setDialog(null);
      return;
    }

    if (target.kind === "item") {
      const group = groups[target.groupIndex];
      const previousLabel = group?.items[target.itemIndex];
      const previousKey = group && previousLabel ? `${group.id}:${previousLabel}` : null;
      const taskId = previousKey ? createdTaskIdsRef.current.get(previousKey) : undefined;
      if (previousKey && taskId !== undefined) {
        createdTaskIdsRef.current.delete(previousKey);
        createdTaskIdsRef.current.set(`${group.id}:${nextLabel}`, taskId);
      }
      const sidebarMeta = previousLabel ? taskSidebarMetaRef.current.get(previousLabel) : undefined;
      if (previousLabel) taskSidebarMetaRef.current.delete(previousLabel);
      if (sidebarMeta) taskSidebarMetaRef.current.set(nextLabel, sidebarMeta);
    }

    setGroups((current) =>
      current.map((group, groupIndex) => {
        if (target.kind === "group") {
          if (groupIndex !== target.groupIndex) return group;
          return { ...group, title: nextLabel };
        }
        if (groupIndex !== target.groupIndex) return group;
        return {
          ...group,
          items: group.items.map((item, itemIndex) =>
            itemIndex === target.itemIndex ? nextLabel : item,
          ),
        };
      }),
    );
    setDialog(null);
  };

  const confirmDelete = () => {
    if (!dialog || dialog.mode !== "delete") return;
    const target = dialog.target;

    if (target.kind === "task") {
      const taskIndexToDelete = target.taskIndex;
      const taskTitle = tasks[taskIndexToDelete];
      const taskKey = taskTitle ? `task:${taskTitle}` : null;
      const taskId = taskKey ? createdTaskIdsRef.current.get(taskKey) : undefined;
      if (taskKey) createdTaskIdsRef.current.delete(taskKey);
      if (taskId !== undefined) onDeleteTask?.(taskId);
      setTasks((current) =>
        current.filter((_, taskIndex) => taskIndex !== taskIndexToDelete),
      );
      setSelectedRow(null);
      setDialog(null);
      return;
    }

    if (target.kind === "item") {
      const group = groups[target.groupIndex];
      const taskTitle = group?.items[target.itemIndex];
      const taskKey = group && taskTitle ? `${group.id}:${taskTitle}` : null;
      const taskId = taskKey ? createdTaskIdsRef.current.get(taskKey) : undefined;
      if (taskKey) createdTaskIdsRef.current.delete(taskKey);
      if (taskId !== undefined) onDeleteTask?.(taskId);
    }

    if (target.kind === "group") {
      const group = groups[target.groupIndex];
      if (group?.items.length) {
        setTasks((current) => [
          ...group.items,
          ...current.filter((task) => !group.items.includes(task)),
        ]);
        group.items.forEach((taskTitle) => {
          const sourceKey = `${group.id}:${taskTitle}`;
          const taskId = createdTaskIdsRef.current.get(sourceKey);
          if (taskId === undefined) return;
          createdTaskIdsRef.current.delete(sourceKey);
          createdTaskIdsRef.current.set(`task:${taskTitle}`, taskId);
          onMoveTask?.(taskId, null);
        });
        setRecentExpanded(true);
      }
      if (group) onDeleteProject?.(group.id);
    }

    setGroups((current) => {
      if (target.kind === "group") {
        return current.filter((_, groupIndex) => groupIndex !== target.groupIndex);
      }
      return current.map((group, groupIndex) =>
        groupIndex === target.groupIndex
          ? {
              ...group,
              items: group.items.filter((_, itemIndex) => itemIndex !== target.itemIndex),
            }
          : group,
      );
    });
    setSelectedRow(null);
    setDialog(null);
  };

  const openCreateProject = () => {
    setCreateProjectValue("");
    setCreateProjectOpen(true);
    setActionMenu(null);
    setCollapsedMenu(null);
  };

  const confirmCreateProject = () => {
    const projectName = createProjectValue.trim();
    if (!projectName) return;
    setGroups((current) => [
      { id: Date.now(), title: projectName, items: [], expanded: false, showAll: false },
      ...current,
    ]);
    setRecentExpanded(true);
    setCreateProjectOpen(false);
    setCreateProjectValue("");
  };

  const createTaskInProject = (project: { id: number; title: string }) => {
    setActionMenu(null);
    setCollapsedMenu(null);
    onCreateTaskInProject?.({ id: project.id, name: project.title });
  };

  const setDragPreview = (event: DragEvent<HTMLDivElement>, label: string) => {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", label);
    const preview = document.createElement("div");
    preview.className = "tree-drag-preview";
    preview.textContent = label;
    document.body.appendChild(preview);
    event.dataTransfer.setDragImage(preview, 12, 13);
    requestAnimationFrame(() => preview.remove());
    setActionMenu(null);
  };

  const setIndicatorAt = (rect: DOMRect, edge: "top" | "bottom") => {
    setDropIndicator({
      left: rect.left + 7,
      top: (edge === "top" ? rect.top : rect.bottom) - 1,
      width: Math.max(24, rect.width - 15),
    });
  };

  const handleItemDragStart = (
    event: DragEvent<HTMLDivElement>,
    groupIndex: number,
    itemIndex: number,
    label: string,
  ) => {
    if ((event.target as HTMLElement).closest(".tree-row__actions")) {
      event.preventDefault();
      return;
    }
    setDragPreview(event, label);
    setDraggedRow({ kind: "item", groupIndex, itemIndex, label });
    setDropTarget({ kind: "task", groupIndex, index: itemIndex });
  };

  const handleLooseTaskDragStart = (
    event: DragEvent<HTMLDivElement>,
    taskIndex: number,
    label: string,
  ) => {
    if ((event.target as HTMLElement).closest(".tree-row__actions")) {
      event.preventDefault();
      return;
    }
    setDragPreview(event, label);
    setDraggedRow({ kind: "task", taskIndex, label });
    setDropTarget({ kind: "task", groupIndex: null, index: taskIndex });
  };

  const handleGroupDragStart = (
    event: DragEvent<HTMLDivElement>,
    groupIndex: number,
    label: string,
  ) => {
    if ((event.target as HTMLElement).closest(".tree-row__actions")) {
      event.preventDefault();
      return;
    }
    setDragPreview(event, label);
    setDraggedRow({ kind: "group", groupIndex, label });
    setDropTarget({ kind: "group", index: groupIndex });
  };

  const handleGroupDragOver = (
    event: DragEvent<HTMLDivElement>,
    groupIndex: number,
  ) => {
    if (!draggedRow) return;
    const rect = event.currentTarget.getBoundingClientRect();

    if (draggedRow.kind === "group") {
      setDropFocusedGroupIndex(null);
      event.preventDefault();
      event.stopPropagation();
      event.dataTransfer.dropEffect = "move";
      const before = event.clientY < rect.top + rect.height / 2;
      setDropTarget({ kind: "group", index: before ? groupIndex : groupIndex + 1 });
      setIndicatorAt(rect, before ? "top" : "bottom");
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = "move";
    setDropFocusedGroupIndex(groupIndex);
    setDropTarget({ kind: "task", groupIndex, index: groups[groupIndex].items.length });
    setIndicatorAt(rect, "bottom");
  };

  const handleTaskDragOver = (
    event: DragEvent<HTMLDivElement>,
    groupIndex: number | null,
    itemIndex: number,
  ) => {
    if (!draggedRow || draggedRow.kind === "group") return;
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = "move";
    setDropFocusedGroupIndex(null);
    const rect = event.currentTarget.getBoundingClientRect();
    const before = event.clientY < rect.top + rect.height / 2;
    setDropTarget({ kind: "task", groupIndex, index: before ? itemIndex : itemIndex + 1 });
    setIndicatorAt(rect, before ? "top" : "bottom");
  };

  const finishDrag = () => {
    if (!draggedRow || !dropTarget) return;

    if (draggedRow.kind === "group" && dropTarget.kind === "group") {
      const nextGroups = [...groups];
      const [movedGroup] = nextGroups.splice(draggedRow.groupIndex, 1);
      const adjustedIndex = dropTarget.index > draggedRow.groupIndex
        ? dropTarget.index - 1
        : dropTarget.index;
      nextGroups.splice(adjustedIndex, 0, movedGroup);
      setGroups(nextGroups);
    }

    if (draggedRow.kind !== "group" && dropTarget.kind === "task") {
      const sourceGroupIndex = draggedRow.kind === "item" ? draggedRow.groupIndex : null;
      const sourceIndex = draggedRow.kind === "item" ? draggedRow.itemIndex : draggedRow.taskIndex;
      const destinationGroupIndex = dropTarget.groupIndex;
      const nextGroups = groups.map((group) => ({ ...group, items: [...group.items] }));
      const nextTasks = [...tasks];
      const sourceItems = sourceGroupIndex === null ? nextTasks : nextGroups[sourceGroupIndex].items;
      const [movedTask] = sourceItems.splice(sourceIndex, 1);
      const destinationItems = destinationGroupIndex === null ? nextTasks : nextGroups[destinationGroupIndex].items;
      const sameContainer = sourceGroupIndex === destinationGroupIndex;
      const adjustedIndex = sameContainer && dropTarget.index > sourceIndex
        ? dropTarget.index - 1
        : dropTarget.index;
      const insertionIndex = Math.min(adjustedIndex, destinationItems.length);
      destinationItems.splice(insertionIndex, 0, movedTask);
      if (destinationGroupIndex !== null) nextGroups[destinationGroupIndex].expanded = true;

      const sourceProjectId = sourceGroupIndex === null ? null : groups[sourceGroupIndex].id;
      const destinationProjectId = destinationGroupIndex === null ? null : groups[destinationGroupIndex].id;
      const sourceKey = `${sourceProjectId ?? "task"}:${movedTask}`;
      const destinationKey = `${destinationProjectId ?? "task"}:${movedTask}`;
      const taskId = createdTaskIdsRef.current.get(sourceKey);
      if (taskId !== undefined) {
        createdTaskIdsRef.current.delete(sourceKey);
        createdTaskIdsRef.current.set(destinationKey, taskId);
        if (sourceProjectId !== destinationProjectId) onMoveTask?.(taskId, destinationProjectId);
      }

      if (selectedRow) {
        const selectedProjectId = selectedRow.kind === "item" ? selectedRow.groupId : null;
        const selectedIndex = selectedRow.kind === "item" ? selectedRow.itemIndex : selectedRow.taskIndex;
        const selectedTaskWasMoved = selectedProjectId === sourceProjectId && selectedIndex === sourceIndex;

        if (selectedTaskWasMoved) {
          setSelectedRow(destinationProjectId === null
            ? { kind: "task", taskIndex: insertionIndex }
            : { kind: "item", groupId: destinationProjectId, itemIndex: insertionIndex });
        } else {
          let nextSelectedIndex = selectedIndex;
          if (selectedProjectId === sourceProjectId && selectedIndex > sourceIndex) nextSelectedIndex -= 1;
          if (selectedProjectId === destinationProjectId && nextSelectedIndex >= insertionIndex) nextSelectedIndex += 1;
          setSelectedRow(selectedProjectId === null
            ? { kind: "task", taskIndex: nextSelectedIndex }
            : { kind: "item", groupId: selectedProjectId, itemIndex: nextSelectedIndex });
        }
      }

      setGroups(nextGroups);
      setTasks(nextTasks);
    }

    setDraggedRow(null);
    setDropTarget(null);
    setDropIndicator(null);
    setDropFocusedGroupIndex(null);
  };

  const cancelDrag = () => {
    setDraggedRow(null);
    setDropTarget(null);
    setDropIndicator(null);
    setDropFocusedGroupIndex(null);
  };

  return (
    <>
    <aside className={`sidebar ${expanded ? "is-expanded" : "is-collapsed"}`}>
      <div className="sidebar__expanded" aria-hidden={!expanded} data-node-id="140:6874">
        <div className="sidebar__fixed">
          <div className="sidebar__header">
            <div className="sidebar__title">
              <IconControl
                size="xsmall"
                variant="bare"
                label={t("返回首页")}
                tooltipPlacement="bottom"
                onClick={openNewTask}
              >
                <FigmaIcon name="chevron-left" size={16} />
              </IconControl>
              <span title={t(pageTitle)}>{t(pageTitle)}</span>
            </div>
            <div className="sidebar__header-actions">
              <IconControl
                label={t("搜索")}
                tooltipPlacement="bottom"
                onClick={() => setSearchOpen((value) => !value)}
              >
                <FigmaIcon name="search" size={20} />
              </IconControl>
              <IconControl label={t("收起侧栏")} tooltipPlacement="bottom" onClick={onToggle}>
                <FigmaIcon name="expand-window" size={20} />
              </IconControl>
            </div>
          </div>

          <nav className="sidebar__primary" aria-label={t("工作台入口")}>
            <button
              type="button"
              onClick={openNewTask}
            >
              <FigmaIcon name="new-task" size={20} />
              <span title={t("新建任务")}>{t("新建任务")}</span>
            </button>
            <button
              type="button"
              className={activeView === "preferences" ? "is-selected" : ""}
              onClick={openPreferences}
            >
              <FigmaIcon name="company-info" size={20} />
              <span title={t("业务偏好档案")}>{t("业务偏好档案")}</span>
            </button>
          </nav>

          <div className="sidebar__divider" />
        </div>

        <div className="sidebar__scroll">
          <section className="sidebar-section sidebar-section--recent">
            <div className="sidebar-section__heading">
              <button
                className="sidebar-section__trigger"
                type="button"
                aria-expanded={recentExpanded}
                onClick={() => setRecentExpanded((value) => !value)}
              >
                <span>{t("最近")}</span>
                <FigmaIcon
                  name="chevron-down"
                  size={16}
                  className={recentExpanded ? "" : "is-closed"}
                />
              </button>
              <IconControl
                label={t("新建项目")}
                tooltipPlacement="left"
                aria-haspopup="dialog"
                aria-expanded={createProjectOpen}
                onClick={openCreateProject}
              >
                <FigmaIcon name="add-project" size={20} />
              </IconControl>
            </div>
            <div className={`sidebar-section__content ${recentExpanded ? "is-open" : ""}`}>
              <div className="sidebar-section__content-inner">
              {groups.map((group, groupIndex) => (
                <div className="tree-group" key={group.id}>
                  <div
                    className={`tree-row-shell tree-row-shell--group ${
                      draggedRow?.kind === "group" && draggedRow.groupIndex === groupIndex
                        ? "is-dragging"
                        : ""
                    } ${
                      dropFocusedGroupIndex === groupIndex && draggedRow?.kind !== "group"
                        ? "is-drop-focused"
                        : ""
                    } ${
                      actionMenu?.target.kind === "group" &&
                      actionMenu.target.groupIndex === groupIndex
                        ? "is-menu-open"
                        : ""
                    }`}
                    draggable={recentExpanded}
                    onDragStart={(event) => handleGroupDragStart(event, groupIndex, group.title)}
                    onDragOver={(event) => handleGroupDragOver(event, groupIndex)}
                    onDragLeave={(event) => {
                      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                        setDropFocusedGroupIndex((current) =>
                          current === groupIndex ? null : current,
                        );
                      }
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      finishDrag();
                    }}
                    onDragEnd={cancelDrag}
                  >
                    <button
                      className="tree-row tree-row--group"
                      type="button"
                      aria-expanded={group.items.length > 0 ? group.expanded : undefined}
                      onClick={() => {
                        if (!group.items.length) return;
                        setGroups((current) =>
                          current.map((currentGroup, currentIndex) =>
                            currentIndex === groupIndex
                              ? {
                                  ...currentGroup,
                                  expanded: !currentGroup.expanded,
                                  showAll: currentGroup.expanded ? false : currentGroup.showAll,
                                }
                              : currentGroup,
                          ),
                        );
                      }}
                    >
                      <ProjectDisclosureIcon expanded={group.expanded} />
                      <span>{group.title}</span>
                    </button>
                    <div className="tree-row__actions tree-row__actions--group">
                      <IconControl
                        size="small"
                        label={t("更多")}
                        tooltipPlacement="top"
                        aria-haspopup="menu"
                        aria-expanded={
                          actionMenu?.target.kind === "group" &&
                          actionMenu.target.groupIndex === groupIndex
                        }
                        onClick={(event) =>
                          openActionMenu(event, { kind: "group", groupIndex })
                        }
                      >
                        <FigmaIcon name="more-horizontal" size={16} />
                      </IconControl>
                      <IconControl
                        size="small"
                        label={t("在{name}中新建对话", { name: group.title })}
                        tooltipPlacement="top"
                        onClick={() => createTaskInProject(group)}
                      >
                        <FigmaIcon name="new-chat" size={16} />
                      </IconControl>
                    </div>
                  </div>
                  <div
                    className={`tree-group__children ${group.expanded ? "is-open" : ""}`}
                    aria-hidden={!group.expanded}
                  >
                    <div className="tree-group__children-inner">
                  {(group.showAll
                    ? group.items
                    : group.items.slice(0, PROJECT_TASK_PREVIEW_LIMIT)
                  ).map((item, itemIndex) => {
                    const mappedTaskId = createdTaskIdsRef.current.get(`${group.id}:${item}`);
                    const isSelected = activeView === "workspace" && (mappedTaskId !== undefined
                      ? activeTaskId === mappedTaskId
                      : activeTaskId === null && selectedRow?.kind === "item" &&
                        selectedRow.groupId === group.id &&
                        selectedRow.itemIndex === itemIndex);

                    return (
                      <div
                        className={`tree-row-shell tree-row-shell--child ${
                          draggedRow?.kind === "item" &&
                          draggedRow.groupIndex === groupIndex &&
                          draggedRow.itemIndex === itemIndex
                            ? "is-dragging"
                            : ""
                        } ${
                          actionMenu?.target.kind === "item" &&
                          actionMenu.target.groupIndex === groupIndex &&
                          actionMenu.target.itemIndex === itemIndex
                            ? "is-menu-open"
                            : ""
                        } ${isSelected ? "is-selected" : ""}`}
                        draggable={group.expanded}
                        onDragStart={(event) =>
                          handleItemDragStart(event, groupIndex, itemIndex, item)
                        }
                        onDragOver={(event) => handleTaskDragOver(event, groupIndex, itemIndex)}
                        onDrop={(event) => {
                          event.preventDefault();
                          finishDrag();
                        }}
                        onDragEnd={cancelDrag}
                        key={`${item}-${itemIndex}`}
                      >
                      <button
                        className="tree-row tree-row--child"
                        type="button"
                        tabIndex={group.expanded ? 0 : -1}
                        aria-current={isSelected ? "page" : undefined}
                        onClick={() => {
                          setSelectedRow({ kind: "item", groupId: group.id, itemIndex });
                          openSavedTask(group.id, item);
                        }}
                      >
                        <span className={`tree-row__selection-indicator ${isSelected ? "is-selected" : ""}`} aria-hidden="true">
                          {isSelected && <span className="system-dot" />}
                        </span>
                        <TaskListItemContent title={item} {...getTaskSidebarMeta(item)} />
                      </button>
                      <div className="tree-row__actions tree-row__actions--child">
                        <IconControl
                          size="small"
                        label={t("更多")}
                          tooltipPlacement="top"
                          aria-haspopup="menu"
                          aria-expanded={
                            actionMenu?.target.kind === "item" &&
                            actionMenu.target.groupIndex === groupIndex &&
                            actionMenu.target.itemIndex === itemIndex
                          }
                          tabIndex={group.expanded ? 0 : -1}
                          onClick={(event) =>
                            openActionMenu(event, { kind: "item", groupIndex, itemIndex })
                          }
                        >
                          <FigmaIcon name="more-horizontal" size={16} />
                        </IconControl>
                      </div>
                      </div>
                    );
                  })}
                  {!group.showAll && group.items.length > PROJECT_TASK_PREVIEW_LIMIT ? (
                    <button
                      type="button"
                      className="tree-group__show-more"
                      onClick={() => setGroups((current) => current.map((currentGroup, currentIndex) =>
                        currentIndex === groupIndex ? { ...currentGroup, showAll: true } : currentGroup,
                      ))}
                    >
                      <FigmaIcon name="more-horizontal" size={16} />
                      <span>{t("展示更多该项目任务")} ({group.items.length})</span>
                    </button>
                  ) : null}
                  {group.showAll && group.items.length > PROJECT_TASK_PREVIEW_LIMIT && groupIndex < groups.length - 1 ? (
                    <div className="tree-group__divider" aria-hidden="true" />
                  ) : null}
                    </div>
                  </div>
                </div>
              ))}
              {groups.length > 0 && tasks.length > 0 ? (
                <div className="recent-content-divider" aria-hidden="true" />
              ) : null}
              <div
                className="recent-task-list"
                onDragOver={(event) => {
                if (!draggedRow || draggedRow.kind === "group") return;
                event.preventDefault();
                event.dataTransfer.dropEffect = "move";
                setDropFocusedGroupIndex(null);
                const rect = event.currentTarget.getBoundingClientRect();
                setDropTarget({ kind: "task", groupIndex: null, index: tasks.length });
                setIndicatorAt(rect, "bottom");
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  finishDrag();
                }}
              >
              {tasks.map((item, index) => {
                const mappedTaskId = createdTaskIdsRef.current.get(`task:${item}`);
                const isSelected = activeView === "workspace" && (mappedTaskId !== undefined
                  ? activeTaskId === mappedTaskId
                  : activeTaskId === null && selectedRow?.kind === "task" && selectedRow.taskIndex === index);
                const isMenuOpen =
                  actionMenu?.target.kind === "task" &&
                  actionMenu.target.taskIndex === index;

                return (
                  <div
                    className={`task-row-shell ${
                      draggedRow?.kind === "task" && draggedRow.taskIndex === index
                        ? "is-dragging"
                        : ""
                    } ${isSelected ? "is-selected" : ""} ${
                      isMenuOpen ? "is-menu-open" : ""
                    }`}
                    draggable={recentExpanded}
                    onDragStart={(event) => handleLooseTaskDragStart(event, index, item)}
                    onDragOver={(event) => handleTaskDragOver(event, null, index)}
                    onDrop={(event) => {
                      event.preventDefault();
                      finishDrag();
                    }}
                    onDragEnd={cancelDrag}
                    key={`${item}-${index}`}
                  >
                    <span className="task-row__selection-surface" aria-hidden="true" />
                    <button
                      className="task-row"
                      type="button"
                      aria-current={isSelected ? "page" : undefined}
                      onClick={() => {
                        setSelectedRow({ kind: "task", taskIndex: index });
                        openSavedTask(null, item);
                      }}
                    >
                      <span className={`tree-row__selection-indicator ${isSelected ? "is-selected" : ""}`} aria-hidden="true">
                        <span className={`system-dot task-row__selection-dot ${isSelected ? "is-visible" : ""}`} />
                      </span>
                      <TaskListItemContent title={item} {...getTaskSidebarMeta(item)} />
                    </button>
                    <div className="tree-row__actions tree-row__actions--task">
                      <IconControl
                        size="small"
                        label={t("更多")}
                        tooltipPlacement="top"
                        aria-haspopup="menu"
                        aria-expanded={isMenuOpen}
                        onClick={(event) =>
                          openActionMenu(event, { kind: "task", taskIndex: index })
                        }
                      >
                        <FigmaIcon name="more-horizontal" size={16} />
                      </IconControl>
                    </div>
                  </div>
                );
              })}
              </div>
            </div>
            </div>
          </section>
        </div>
      </div>

      <div className="sidebar__collapsed" aria-hidden={expanded}>
        <div className="sidebar__collapsed-primary">
          <IconControl label={t("展开菜单")} tooltipPlacement="right" onClick={onToggle}>
            <FigmaIcon name="expand-window" size={20} />
          </IconControl>
        </div>
        <div className="sidebar__collapsed-secondary">
          <IconControl label={t("新建任务")} tooltipPlacement="right" onClick={openNewTask}>
            <FigmaIcon name="new-task" size={20} />
          </IconControl>
          <IconControl label={t("企业偏好档案")} tooltipPlacement="right" onClick={openPreferences}>
            <FigmaIcon name="company-info" size={20} />
          </IconControl>
          <div className="collapsed-divider" />
        </div>
        <div className="sidebar__collapsed-overflow">
          <div
            ref={collapsedRecentTriggerRef}
            className="collapsed-menu-trigger"
            onMouseEnter={() => openCollapsedMenu("recent")}
            onMouseLeave={scheduleCollapsedMenuClose}
            onFocus={() => openCollapsedMenu("recent")}
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                scheduleCollapsedMenuClose();
              }
            }}
          >
            <IconControl
              label={t("最近")}
              showTooltip={false}
              aria-haspopup="menu"
              aria-expanded={collapsedMenu === "recent"}
            >
              <FigmaIcon name="task" size={20} />
            </IconControl>
            <div
              className={`collapsed-flyout collapsed-flyout--recent ${collapsedMenu === "recent" ? "is-open" : ""}`}
              role="menu"
              aria-label={t("最近")}
              onMouseEnter={() => openCollapsedMenu("recent")}
              style={{ maxHeight: collapsedFlyoutMaxHeight }}
            >
              <div className="collapsed-flyout__header">
                <span>{t("最近")}</span>
                <IconControl
                  label={t("新建项目")}
                  tooltipPlacement="left"
                  aria-haspopup="dialog"
                  aria-expanded={createProjectOpen}
                  onClick={openCreateProject}
                >
                  <FigmaIcon name="add-project" size={20} />
                </IconControl>
              </div>
              <div className="collapsed-flyout__recent-content">
              {groups.map((group, groupIndex) => (
                <div className="tree-group" key={`flyout-${group.id}`}>
                  <div
                    className={`tree-row-shell tree-row-shell--group ${
                      draggedRow?.kind === "group" && draggedRow.groupIndex === groupIndex
                        ? "is-dragging"
                        : ""
                    } ${
                      dropFocusedGroupIndex === groupIndex && draggedRow?.kind !== "group"
                        ? "is-drop-focused"
                        : ""
                    } ${
                      actionMenu?.target.kind === "group" &&
                      actionMenu.target.groupIndex === groupIndex
                        ? "is-menu-open"
                        : ""
                    }`}
                    draggable
                    onDragStart={(event) => handleGroupDragStart(event, groupIndex, group.title)}
                    onDragOver={(event) => handleGroupDragOver(event, groupIndex)}
                    onDragLeave={(event) => {
                      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                        setDropFocusedGroupIndex((current) =>
                          current === groupIndex ? null : current,
                        );
                      }
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      finishDrag();
                    }}
                    onDragEnd={cancelDrag}
                  >
                    <button
                      className="tree-row tree-row--group"
                      type="button"
                      role="menuitem"
                      aria-expanded={group.items.length > 0 ? group.expanded : undefined}
                      onClick={() => {
                        if (!group.items.length) return;
                        setGroups((current) =>
                          current.map((currentGroup, currentIndex) =>
                            currentIndex === groupIndex
                              ? {
                                  ...currentGroup,
                                  expanded: !currentGroup.expanded,
                                  showAll: currentGroup.expanded ? false : currentGroup.showAll,
                                }
                              : currentGroup,
                          ),
                        );
                      }}
                    >
                      <ProjectDisclosureIcon expanded={group.expanded} />
                      <span>{group.title}</span>
                    </button>
                    <div className="tree-row__actions tree-row__actions--group">
                      <IconControl
                        size="small"
                        label={t("更多")}
                        tooltipPlacement="top"
                        aria-haspopup="menu"
                        aria-expanded={
                          actionMenu?.target.kind === "group" &&
                          actionMenu.target.groupIndex === groupIndex
                        }
                        onClick={(event) =>
                          openActionMenu(event, { kind: "group", groupIndex })
                        }
                      >
                        <FigmaIcon name="more-horizontal" size={16} />
                      </IconControl>
                      <IconControl
                        size="small"
                        label={t("在{name}中新建对话", { name: group.title })}
                        tooltipPlacement="top"
                        onClick={() => createTaskInProject(group)}
                      >
                        <FigmaIcon name="new-chat" size={16} />
                      </IconControl>
                    </div>
                  </div>
                  <div
                    className={`tree-group__children ${group.expanded ? "is-open" : ""}`}
                    aria-hidden={!group.expanded}
                  >
                    <div className="tree-group__children-inner">
                      {(group.showAll
                        ? group.items
                        : group.items.slice(0, PROJECT_TASK_PREVIEW_LIMIT)
                      ).map((item, itemIndex) => {
                        const mappedTaskId = createdTaskIdsRef.current.get(`${group.id}:${item}`);
                        const isSelected = activeView === "workspace" && (mappedTaskId !== undefined
                          ? activeTaskId === mappedTaskId
                          : activeTaskId === null &&
                            selectedRow?.kind === "item" &&
                            selectedRow.groupId === group.id &&
                            selectedRow.itemIndex === itemIndex);
                        const isMenuOpen =
                          actionMenu?.target.kind === "item" &&
                          actionMenu.target.groupIndex === groupIndex &&
                          actionMenu.target.itemIndex === itemIndex;

                        return (
                          <div
                            className={`tree-row-shell tree-row-shell--child ${
                              isSelected ? "is-selected" : ""
                            } ${isMenuOpen ? "is-menu-open" : ""} ${
                              draggedRow?.kind === "item" &&
                              draggedRow.groupIndex === groupIndex &&
                              draggedRow.itemIndex === itemIndex
                                ? "is-dragging"
                                : ""
                            }`}
                            draggable={group.expanded}
                            onDragStart={(event) =>
                              handleItemDragStart(event, groupIndex, itemIndex, item)
                            }
                            onDragOver={(event) =>
                              handleTaskDragOver(event, groupIndex, itemIndex)
                            }
                            onDrop={(event) => {
                              event.preventDefault();
                              finishDrag();
                            }}
                            onDragEnd={cancelDrag}
                            key={`${item}-flyout-${itemIndex}`}
                          >
                            <button
                              className="tree-row tree-row--child"
                              type="button"
                              role="menuitem"
                              aria-current={isSelected ? "page" : undefined}
                              onClick={() => {
                                setSelectedRow({ kind: "item", groupId: group.id, itemIndex });
                                openSavedTask(group.id, item);
                              }}
                            >
                              <span className={`tree-row__selection-indicator ${isSelected ? "is-selected" : ""}`} aria-hidden="true">
                                {isSelected && <span className="system-dot" />}
                              </span>
                              <TaskListItemContent title={item} {...getTaskSidebarMeta(item)} />
                            </button>
                            <div className="tree-row__actions tree-row__actions--child">
                              <IconControl
                                size="small"
                        label={t("更多")}
                                tooltipPlacement="top"
                                aria-haspopup="menu"
                                aria-expanded={isMenuOpen}
                                onClick={(event) =>
                                  openActionMenu(event, {
                                    kind: "item",
                                    groupIndex,
                                    itemIndex,
                                  })
                                }
                              >
                                <FigmaIcon name="more-horizontal" size={16} />
                              </IconControl>
                            </div>
                          </div>
                        );
                      })}
                      {!group.showAll && group.items.length > PROJECT_TASK_PREVIEW_LIMIT ? (
                        <button
                          type="button"
                          className="tree-group__show-more"
                          onClick={() => setGroups((current) => current.map((currentGroup, currentIndex) =>
                            currentIndex === groupIndex ? { ...currentGroup, showAll: true } : currentGroup,
                          ))}
                        >
                          <FigmaIcon name="more-horizontal" size={16} />
                          <span>{t("展示更多该项目任务")} ({group.items.length})</span>
                        </button>
                      ) : null}
                      {group.showAll && group.items.length > PROJECT_TASK_PREVIEW_LIMIT && groupIndex < groups.length - 1 ? (
                        <div className="tree-group__divider" aria-hidden="true" />
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
              {groups.length > 0 && tasks.length > 0 ? (
                <div className="recent-content-divider" aria-hidden="true" />
              ) : null}
              <div
                className="collapsed-flyout__recent-tasks"
                onDragOver={(event) => {
                  if (!draggedRow || draggedRow.kind === "group") return;
                  event.preventDefault();
                  event.dataTransfer.dropEffect = "move";
                  setDropFocusedGroupIndex(null);
                  const rect = event.currentTarget.getBoundingClientRect();
                  setDropTarget({ kind: "task", groupIndex: null, index: tasks.length });
                  setIndicatorAt(rect, "bottom");
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  finishDrag();
                }}
              >
                {tasks.map((item, index) => {
                  const mappedTaskId = createdTaskIdsRef.current.get(`task:${item}`);
                  const isSelected = activeView === "workspace" && (mappedTaskId !== undefined
                    ? activeTaskId === mappedTaskId
                    : activeTaskId === null &&
                      selectedRow?.kind === "task" && selectedRow.taskIndex === index);
                  const isMenuOpen =
                    actionMenu?.target.kind === "task" &&
                    actionMenu.target.taskIndex === index;

                  return (
                    <div
                      className={`task-row-shell ${
                        draggedRow?.kind === "task" && draggedRow.taskIndex === index
                          ? "is-dragging"
                          : ""
                      } ${isSelected ? "is-selected" : ""} ${
                        isMenuOpen ? "is-menu-open" : ""
                      }`}
                      draggable
                      onDragStart={(event) => handleLooseTaskDragStart(event, index, item)}
                      onDragOver={(event) => handleTaskDragOver(event, null, index)}
                      onDrop={(event) => {
                        event.preventDefault();
                        finishDrag();
                      }}
                      onDragEnd={cancelDrag}
                      key={`${item}-recent-flyout-${index}`}
                    >
                      <span className="task-row__selection-surface" aria-hidden="true" />
                      <button
                        className="task-row"
                        type="button"
                        role="menuitem"
                        aria-current={isSelected ? "page" : undefined}
                        onClick={() => {
                          setSelectedRow({ kind: "task", taskIndex: index });
                          openSavedTask(null, item);
                        }}
                      >
                        <span className={`tree-row__selection-indicator ${isSelected ? "is-selected" : ""}`} aria-hidden="true">
                          <span className={`system-dot task-row__selection-dot ${isSelected ? "is-visible" : ""}`} />
                        </span>
                        <TaskListItemContent title={item} {...getTaskSidebarMeta(item)} />
                      </button>
                      <div className="tree-row__actions tree-row__actions--task">
                        <IconControl
                          size="small"
                          label={t("更多")}
                          tooltipPlacement="top"
                          aria-haspopup="menu"
                          aria-expanded={isMenuOpen}
                          onClick={(event) =>
                            openActionMenu(event, { kind: "task", taskIndex: index })
                          }
                        >
                          <FigmaIcon name="more-horizontal" size={16} />
                        </IconControl>
                      </div>
                    </div>
                  );
                })}
              </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {searchOpen && expanded && (
          <motion.div
            className="search-popover-viewport"
            initial="closed"
            animate="open"
            exit="closed"
            variants={{ closed: {}, open: {} }}
          >
            <motion.div
              className="search-popover"
              role="dialog"
              aria-label={t("搜索历史任务或项目")}
              onPointerDown={(event) => {
                const target = event.target;
                if (target instanceof Element && !target.closest("input, button, a")) {
                  searchInputRef.current?.blur();
                }
              }}
              variants={{
                closed: { x: -400, opacity: 0 },
                open: { x: 0, opacity: 1 },
              }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              <div className="search-popover__field">
                <FigmaIcon name="search" size={20} />
                <input
                  ref={searchInputRef}
                  autoFocus
                  value={searchQuery}
                  placeholder={t("搜索历史任务或项目")}
                  onChange={(event) => setSearchQuery(event.target.value)}
                />
                {searchQuery && (
                  <IconControl
                    size="small"
                    label={t("清空搜索")}
                    tooltipPlacement="top"
                    onClick={() => setSearchQuery("")}
                  >
                    <FigmaIcon name="clear" size={16} />
                  </IconControl>
                )}
                <span className="search-popover__field-divider" aria-hidden="true" />
                <IconControl
                  size="small"
                  label={t("关闭搜索")}
                  tooltipPlacement="top"
                  onClick={() => setSearchOpen(false)}
                >
                  <FigmaIcon name="close" size={16} />
                </IconControl>
              </div>
              <div className="search-popover__results">
                <p className="search-popover__label">{t(searchQuery ? "搜索结果" : "最近编辑")}</p>
                {visibleRecentItems.length > 0 ? (
                  <div className="search-popover__list" aria-live="polite">
                    {visibleRecentItems.map(([title, meta], index) => (
                      <button
                        type="button"
                        key={`${title}-${index}`}
                        onClick={() => openSearchResult(title)}
                      >
                        <strong>{title}</strong>
                        <span>{meta}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="search-popover__empty" aria-live="polite">
                    <div className="search-popover__empty-message">
                      <img src={assetUrl("assets/business-profile/EmptyIcon.png")} alt="" />
                      <div>
                        <strong>{t("暂无匹配结果")}</strong>
                        <span>{t("尝试换个关键词输入重新试试")}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </aside>

    {dropIndicator && draggedRow && typeof document !== "undefined" && createPortal(
      <span
        className="sidebar-drop-indicator"
        aria-hidden="true"
        style={{ left: dropIndicator.left, top: dropIndicator.top, width: dropIndicator.width }}
      />,
      document.body,
    )}

    {actionMenu && typeof document !== "undefined" && createPortal(
      <div
        ref={actionMenuRef}
        className="sidebar-action-menu"
        role="menu"
        aria-label={t("{name}的操作", { name: getTargetLabel(actionMenu.target) })}
        style={{ left: actionMenu.left, top: actionMenu.top }}
        onKeyDown={handleActionMenuKeyDown}
      >
        <button
          className="sidebar-action-menu__item"
          type="button"
          role="menuitem"
          autoFocus
          onClick={() => startDialog("rename")}
        >
          <FigmaIcon name="modify" size={16} />
          <span>{t("重命名")}</span>
        </button>
        <button
          className="sidebar-action-menu__item is-danger"
          type="button"
          role="menuitem"
          onClick={() => startDialog("delete")}
        >
          <FigmaIcon name="trash" size={16} />
          <span>{t("删除")}</span>
        </button>
      </div>,
      document.body,
    )}

    {dialog && typeof document !== "undefined" && createPortal(
      <div
        className="sidebar-dialog-backdrop"
        onMouseDown={(event) => {
          if (event.currentTarget === event.target) setDialog(null);
        }}
      >
        <section
          className="sidebar-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="sidebar-dialog-title"
        >
          <header className="sidebar-dialog__header">
            <h2 id="sidebar-dialog-title">
              {dialog.mode === "rename"
                ? t("重命名")
                : dialog.target.kind === "group"
                  ? t("删除此项目？")
                  : dialog.target.kind === "task"
                    ? t("删除此任务？")
                    : t("删除此对话？")}
            </h2>
            <IconControl label={t("关闭")} tooltipPlacement="left" onClick={() => setDialog(null)}>
              <FigmaIcon name="close" size={20} />
            </IconControl>
          </header>

          {dialog.mode === "rename" ? (
            <form
              className="sidebar-dialog__form"
              onSubmit={(event) => {
                event.preventDefault();
                confirmRename();
              }}
            >
              <div className="sidebar-dialog__input-wrap">
                <input
                  autoFocus
                  value={renameValue}
                  maxLength={200}
                  placeholder={
                    dialog.target.kind === "group"
                      ? t("输入项目名称")
                      : dialog.target.kind === "task"
                        ? t("输入任务名称")
                        : t("输入对话名称")
                  }
                  aria-label={
                    dialog.target.kind === "group"
                      ? t("项目名称")
                      : dialog.target.kind === "task"
                        ? t("任务名称")
                        : t("对话名称")
                  }
                  onChange={(event) => setRenameValue(event.target.value)}
                />
                <span>{renameValue.length}/200</span>
              </div>
              <footer className="sidebar-dialog__footer">
                <button className="sidebar-dialog__button sidebar-dialog__button--secondary" type="button" onClick={() => setDialog(null)}>
                  {t("取消")}
                </button>
                <button className="sidebar-dialog__button sidebar-dialog__button--primary" type="submit" disabled={!renameValue.trim()}>
                  {t("确认")}
                </button>
              </footer>
            </form>
          ) : (
            <div className="sidebar-dialog__delete-content">
              <p>{t(dialog.target.kind === "group" ? "项目中的任务将移至任务列表，项目删除后不可恢复。" : "删除后不可恢复，您确定删除吗？")}</p>
              <footer className="sidebar-dialog__footer">
                <button className="sidebar-dialog__button sidebar-dialog__button--secondary" type="button" autoFocus onClick={() => setDialog(null)}>
                  {t("取消")}
                </button>
                <button className="sidebar-dialog__button sidebar-dialog__button--danger" type="button" onClick={confirmDelete}>
                  {t("删除")}
                </button>
              </footer>
            </div>
          )}
        </section>
      </div>,
      document.body,
    )}

    {createProjectOpen && typeof document !== "undefined" && createPortal(
      <div
        className="sidebar-dialog-backdrop"
        onMouseDown={(event) => {
          if (event.currentTarget === event.target) setCreateProjectOpen(false);
        }}
      >
        <section
          className="sidebar-dialog sidebar-create-project-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-project-dialog-title"
          aria-describedby="create-project-dialog-description"
          data-node-id="444:90446"
        >
          <header className="sidebar-dialog__header sidebar-create-project-dialog__header">
            <div>
              <h2 id="create-project-dialog-title">{t("创建项目")}</h2>
              <p id="create-project-dialog-description">
                {t("项目用于整理历史任务，名称最多 40 个字符")}
              </p>
            </div>
            <IconControl
              label={t("关闭")}
              tooltipPlacement="left"
              onClick={() => setCreateProjectOpen(false)}
            >
              <FigmaIcon name="close" size={20} />
            </IconControl>
          </header>

          <form
            className="sidebar-dialog__form sidebar-create-project-dialog__form"
            onSubmit={(event) => {
              event.preventDefault();
              confirmCreateProject();
            }}
          >
            <div className="sidebar-dialog__input-wrap">
              <input
                autoFocus
                value={createProjectValue}
                maxLength={40}
                placeholder={t("输入项目名称")}
                aria-label={t("项目名称")}
                onChange={(event) => setCreateProjectValue(event.target.value)}
              />
              <span>{createProjectValue.length}/40</span>
            </div>
            <footer className="sidebar-dialog__footer">
              <button
                className="sidebar-dialog__button sidebar-dialog__button--secondary"
                type="button"
                onClick={() => setCreateProjectOpen(false)}
              >
                {t("取消")}
              </button>
              <button
                className="sidebar-dialog__button sidebar-dialog__button--primary"
                type="submit"
                disabled={!createProjectValue.trim()}
              >
                {t("创建")}
              </button>
            </footer>
          </form>
        </section>
      </div>,
      document.body,
    )}
    </>
  );
}
