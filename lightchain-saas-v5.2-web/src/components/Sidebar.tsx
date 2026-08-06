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
import { projectGroups, recentItems, taskItems } from "../data/workspace";
import { FigmaIcon } from "./FigmaIcon";
import { IconControl } from "./IconControl";
import { useI18n } from "../i18n";

type SidebarProps = {
  expanded: boolean;
  onToggle: () => void;
  activeView?: "workspace" | "preferences";
  onOpenWorkspace?: () => void;
  onOpenPreferences?: () => void;
  createdTask?: { id: number; title: string; projectId: number | null } | null;
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

type DraggedRow = {
  groupIndex: number;
  itemIndex: number;
  label: string;
};

type SelectedRow =
  | { kind: "item"; groupIndex: number; itemIndex: number }
  | { kind: "task"; taskIndex: number };

export function Sidebar({
  expanded,
  onToggle,
  activeView = "workspace",
  onOpenWorkspace,
  onOpenPreferences,
  createdTask,
}: SidebarProps) {
  const { t } = useI18n();
  const [projectsExpanded, setProjectsExpanded] = useState(true);
  const [tasksExpanded, setTasksExpanded] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const [collapsedMenu, setCollapsedMenu] = useState<"projects" | "tasks" | null>(null);
  const [groups, setGroups] = useState(() =>
    projectGroups.map((group) => ({
      ...group,
      items: [...group.items],
      expanded: group.items.length > 0,
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
  const [dropTarget, setDropTarget] = useState<{ groupIndex: number; index: number } | null>(null);
  const actionMenuRef = useRef<HTMLDivElement>(null);
  const actionMenuAnchorRef = useRef<HTMLButtonElement | null>(null);
  const actionMenuStateRef = useRef<ActionMenuState | null>(null);
  const collapsedMenuCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastCreatedTaskIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (!createdTask || lastCreatedTaskIdRef.current === createdTask.id) return;
    lastCreatedTaskIdRef.current = createdTask.id;

    if (createdTask.projectId === null) {
      setTasks((current) => [createdTask.title, ...current]);
      setTasksExpanded(true);
      setSelectedRow({ kind: "task", taskIndex: 0 });
      return;
    }

    setGroups((current) =>
      current.map((group, groupIndex) =>
        groupIndex === createdTask.projectId
          ? { ...group, items: [createdTask.title, ...group.items], expanded: true }
          : group,
      ),
    );
    setProjectsExpanded(true);
    setSelectedRow({ kind: "item", groupIndex: createdTask.projectId, itemIndex: 0 });
  }, [createdTask]);

  const openCollapsedMenu = (menu: "projects" | "tasks") => {
    if (collapsedMenuCloseTimerRef.current) {
      clearTimeout(collapsedMenuCloseTimerRef.current);
      collapsedMenuCloseTimerRef.current = null;
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
    if (!expanded) {
      setActionMenu(null);
      setDraggedRow(null);
      setDropTarget(null);
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
      setTasks((current) =>
        current.map((task, taskIndex) =>
          taskIndex === taskIndexToRename ? nextLabel : task,
        ),
      );
      setDialog(null);
      return;
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
      setTasks((current) =>
        current.filter((_, taskIndex) => taskIndex !== taskIndexToDelete),
      );
      setSelectedRow(null);
      setDialog(null);
      return;
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
      { title: projectName, items: [], expanded: false },
      ...current,
    ]);
    setProjectsExpanded(true);
    setCreateProjectOpen(false);
    setCreateProjectValue("");
  };

  const handleDragStart = (
    event: DragEvent<HTMLDivElement>,
    groupIndex: number,
    itemIndex: number,
    label: string,
  ) => {
    if ((event.target as HTMLElement).closest(".tree-row__actions")) {
      event.preventDefault();
      return;
    }

    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", label);
    const preview = document.createElement("div");
    preview.className = "tree-drag-preview";
    preview.textContent = label;
    document.body.appendChild(preview);
    event.dataTransfer.setDragImage(preview, 12, 13);
    requestAnimationFrame(() => preview.remove());

    setActionMenu(null);
    setDraggedRow({ groupIndex, itemIndex, label });
    setDropTarget({ groupIndex, index: itemIndex });
  };

  const handleDragOver = (
    event: DragEvent<HTMLDivElement>,
    groupIndex: number,
    itemIndex: number,
  ) => {
    if (!draggedRow || draggedRow.groupIndex !== groupIndex) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    const rect = event.currentTarget.getBoundingClientRect();
    const index = event.clientY < rect.top + rect.height / 2 ? itemIndex : itemIndex + 1;
    setDropTarget({ groupIndex, index });
  };

  const finishDrag = () => {
    if (draggedRow && dropTarget && draggedRow.groupIndex === dropTarget.groupIndex) {
      setGroups((current) =>
        current.map((group, groupIndex) => {
          if (groupIndex !== draggedRow.groupIndex) return group;
          const items = [...group.items];
          const [movedItem] = items.splice(draggedRow.itemIndex, 1);
          const adjustedIndex =
            dropTarget.index > draggedRow.itemIndex ? dropTarget.index - 1 : dropTarget.index;
          items.splice(adjustedIndex, 0, movedItem);
          return { ...group, items };
        }),
      );
    }
    setDraggedRow(null);
    setDropTarget(null);
  };

  return (
    <>
    <aside className={`sidebar ${expanded ? "is-expanded" : "is-collapsed"}`}>
      <div className="sidebar__expanded" aria-hidden={!expanded} data-node-id="140:6874">
        <div className="sidebar__fixed">
          <div className="sidebar__header">
            <div className="sidebar__title">
              <FigmaIcon name="chevron-left" size={20} />
              <span title={t("灵感决策工作台")}>{t("灵感决策工作台")}</span>
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
              className={activeView === "workspace" ? "is-selected" : ""}
              onClick={onOpenWorkspace}
            >
              <FigmaIcon name="new-task" size={20} />
              <span title={t("新建任务")}>{t("新建任务")}</span>
            </button>
            <button
              type="button"
              className={activeView === "preferences" ? "is-selected" : ""}
              onClick={onOpenPreferences}
            >
              <FigmaIcon name="company-info" size={20} />
              <span title={t("业务偏好档案")}>{t("业务偏好档案")}</span>
            </button>
          </nav>

          <div className="sidebar__divider" />
        </div>

        <div className="sidebar__scroll">
          <section className="sidebar-section">
            <div className="sidebar-section__heading">
              <button
                className="sidebar-section__trigger"
                type="button"
                aria-expanded={projectsExpanded}
                onClick={() => setProjectsExpanded((value) => !value)}
              >
                <span>{t("项目")}</span>
                <FigmaIcon
                  name="chevron-down"
                  size={16}
                  className={projectsExpanded ? "" : "is-closed"}
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
            <div className={`sidebar-section__content ${projectsExpanded ? "is-open" : ""}`}>
              <div className="sidebar-section__content-inner">
              {groups.map((group, groupIndex) => (
                <div className="tree-group" key={`${group.title}-${groupIndex}`}>
                  <div
                    className={`tree-row-shell tree-row-shell--group ${
                      actionMenu?.target.kind === "group" &&
                      actionMenu.target.groupIndex === groupIndex
                        ? "is-menu-open"
                        : ""
                    }`}
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
                              ? { ...currentGroup, expanded: !currentGroup.expanded }
                              : currentGroup,
                          ),
                        );
                      }}
                    >
                      <FigmaIcon
                        name={group.items.length > 0 ? "chevron-down" : "chevron-right"}
                        size={16}
                        className={group.items.length > 0 && !group.expanded ? "is-closed" : ""}
                      />
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
                      <IconControl size="small" label={t("在{name}中新建对话", { name: group.title })} tooltipPlacement="top">
                        <FigmaIcon name="new-chat" size={16} />
                      </IconControl>
                    </div>
                  </div>
                  <div
                    className={`tree-group__children ${group.expanded ? "is-open" : ""}`}
                    aria-hidden={!group.expanded}
                  >
                    <div className="tree-group__children-inner">
                  {group.items.map((item, itemIndex) => {
                    const isSelected =
                      selectedRow?.kind === "item" &&
                      selectedRow.groupIndex === groupIndex &&
                      selectedRow.itemIndex === itemIndex;

                    return (
                      <div
                        className={`tree-row-shell tree-row-shell--child ${
                          draggedRow?.groupIndex === groupIndex &&
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
                          handleDragStart(event, groupIndex, itemIndex, item)
                        }
                        onDragOver={(event) => handleDragOver(event, groupIndex, itemIndex)}
                        onDrop={(event) => {
                          event.preventDefault();
                          finishDrag();
                        }}
                        onDragEnd={() => {
                          setDraggedRow(null);
                          setDropTarget(null);
                        }}
                        key={`${item}-${itemIndex}`}
                      >
                      {dropTarget?.groupIndex === groupIndex &&
                        dropTarget.index === itemIndex && (
                          <span className="tree-drop-indicator tree-drop-indicator--top" />
                        )}
                      <button
                        className="tree-row tree-row--child"
                        type="button"
                        tabIndex={group.expanded ? 0 : -1}
                        aria-current={isSelected ? "page" : undefined}
                        onClick={() => setSelectedRow({ kind: "item", groupIndex, itemIndex })}
                      >
                        <span className="tree-row__selection-indicator" aria-hidden="true">
                          {isSelected && <span className="system-dot" />}
                        </span>
                        <span>{item}</span>
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
                      {dropTarget?.groupIndex === groupIndex &&
                        dropTarget.index === group.items.length &&
                        itemIndex === group.items.length - 1 && (
                          <span className="tree-drop-indicator tree-drop-indicator--bottom" />
                        )}
                      </div>
                    );
                  })}
                    </div>
                  </div>
                </div>
              ))}
              </div>
            </div>
            <div className="sidebar__divider sidebar__divider--section" />
          </section>

          <section className="sidebar-section sidebar-section--tasks">
            <div className="sidebar-section__heading sidebar-section__heading--tasks">
              <button
                className="sidebar-section__trigger"
                type="button"
                aria-expanded={tasksExpanded}
                onClick={() => setTasksExpanded((value) => !value)}
              >
                <span>{t("任务")}</span>
                <FigmaIcon
                  name="chevron-down"
                  size={16}
                  className={tasksExpanded ? "" : "is-closed"}
                />
              </button>
            </div>
            <div className={`sidebar-section__content task-list ${tasksExpanded ? "is-open" : ""}`}>
              <div className="sidebar-section__content-inner">
              {tasks.map((item, index) => {
                const isSelected =
                  selectedRow?.kind === "task" && selectedRow.taskIndex === index;
                const isMenuOpen =
                  actionMenu?.target.kind === "task" &&
                  actionMenu.target.taskIndex === index;

                return (
                  <div
                    className={`task-row-shell ${isSelected ? "is-selected" : ""} ${
                      isMenuOpen ? "is-menu-open" : ""
                    }`}
                    key={`${item}-${index}`}
                  >
                    <span className="task-row__selection-surface" aria-hidden="true" />
                    <button
                      className="task-row"
                      type="button"
                      aria-current={isSelected ? "page" : undefined}
                      onClick={() => setSelectedRow({ kind: "task", taskIndex: index })}
                    >
                      <span className="tree-row__selection-indicator" aria-hidden="true">
                        <span className={`system-dot task-row__selection-dot ${isSelected ? "is-visible" : ""}`} />
                      </span>
                      <span>{item}</span>
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
          <IconControl label={t("新建任务")} tooltipPlacement="right">
            <FigmaIcon name="new-task" size={20} />
          </IconControl>
          <IconControl label={t("企业偏好档案")} tooltipPlacement="right">
            <FigmaIcon name="company-info" size={20} />
          </IconControl>
          <div className="collapsed-divider" />
        </div>
        <div className="sidebar__collapsed-overflow">
          <div
            className="collapsed-menu-trigger"
            onMouseEnter={() => openCollapsedMenu("projects")}
            onMouseLeave={scheduleCollapsedMenuClose}
            onFocus={() => openCollapsedMenu("projects")}
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                scheduleCollapsedMenuClose();
              }
            }}
          >
            <IconControl
              label={t("项目")}
              showTooltip={false}
              aria-haspopup="menu"
              aria-expanded={collapsedMenu === "projects"}
            >
              <FigmaIcon name="project" size={20} />
            </IconControl>
            <div
              className={`collapsed-flyout collapsed-flyout--projects ${collapsedMenu === "projects" ? "is-open" : ""}`}
              role="menu"
              aria-label={t("项目")}
              onMouseEnter={() => openCollapsedMenu("projects")}
            >
              {groups.map((group, groupIndex) => (
                <div className="tree-group" key={`${group.title}-flyout-${groupIndex}`}>
                  <div
                    className={`tree-row-shell tree-row-shell--group ${
                      actionMenu?.target.kind === "group" &&
                      actionMenu.target.groupIndex === groupIndex
                        ? "is-menu-open"
                        : ""
                    }`}
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
                              ? { ...currentGroup, expanded: !currentGroup.expanded }
                              : currentGroup,
                          ),
                        );
                      }}
                    >
                      <FigmaIcon
                        name={group.items.length > 0 ? "chevron-down" : "chevron-right"}
                        size={16}
                        className={group.items.length > 0 && !group.expanded ? "is-closed" : ""}
                      />
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
                      {group.items.map((item, itemIndex) => {
                        const isSelected =
                          selectedRow?.kind === "item" &&
                          selectedRow.groupIndex === groupIndex &&
                          selectedRow.itemIndex === itemIndex;
                        const isMenuOpen =
                          actionMenu?.target.kind === "item" &&
                          actionMenu.target.groupIndex === groupIndex &&
                          actionMenu.target.itemIndex === itemIndex;

                        return (
                          <div
                            className={`tree-row-shell tree-row-shell--child ${
                              isSelected ? "is-selected" : ""
                            } ${isMenuOpen ? "is-menu-open" : ""} ${
                              draggedRow?.groupIndex === groupIndex &&
                              draggedRow.itemIndex === itemIndex
                                ? "is-dragging"
                                : ""
                            }`}
                            draggable={group.expanded}
                            onDragStart={(event) =>
                              handleDragStart(event, groupIndex, itemIndex, item)
                            }
                            onDragOver={(event) =>
                              handleDragOver(event, groupIndex, itemIndex)
                            }
                            onDrop={(event) => {
                              event.preventDefault();
                              finishDrag();
                            }}
                            onDragEnd={() => {
                              setDraggedRow(null);
                              setDropTarget(null);
                            }}
                            key={`${item}-flyout-${itemIndex}`}
                          >
                            {dropTarget?.groupIndex === groupIndex &&
                              dropTarget.index === itemIndex && (
                                <span className="tree-drop-indicator tree-drop-indicator--top" />
                              )}
                            <button
                              className="tree-row tree-row--child"
                              type="button"
                              role="menuitem"
                              aria-current={isSelected ? "page" : undefined}
                              onClick={() =>
                                setSelectedRow({ kind: "item", groupIndex, itemIndex })
                              }
                            >
                              <span className="tree-row__selection-indicator" aria-hidden="true">
                                {isSelected && <span className="system-dot" />}
                              </span>
                              <span>{item}</span>
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
                            {dropTarget?.groupIndex === groupIndex &&
                              dropTarget.index === group.items.length &&
                              itemIndex === group.items.length - 1 && (
                                <span className="tree-drop-indicator tree-drop-indicator--bottom" />
                              )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div
            className="collapsed-menu-trigger"
            onMouseEnter={() => openCollapsedMenu("tasks")}
            onMouseLeave={scheduleCollapsedMenuClose}
            onFocus={() => openCollapsedMenu("tasks")}
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                scheduleCollapsedMenuClose();
              }
            }}
          >
            <IconControl
              label={t("任务")}
              showTooltip={false}
              aria-haspopup="menu"
              aria-expanded={collapsedMenu === "tasks"}
            >
              <FigmaIcon name="task" size={20} />
            </IconControl>
            <div
              className={`collapsed-flyout collapsed-flyout--tasks ${collapsedMenu === "tasks" ? "is-open" : ""}`}
              role="menu"
              aria-label={t("任务")}
              onMouseEnter={() => openCollapsedMenu("tasks")}
            >
              {tasks.map((item, index) => {
                const isSelected =
                  selectedRow?.kind === "task" && selectedRow.taskIndex === index;
                const isMenuOpen =
                  actionMenu?.target.kind === "task" &&
                  actionMenu.target.taskIndex === index;

                return (
                  <div
                    className={`task-row-shell ${isSelected ? "is-selected" : ""} ${
                      isMenuOpen ? "is-menu-open" : ""
                    }`}
                    key={`${item}-flyout-${index}`}
                  >
                    <span className="task-row__selection-surface" aria-hidden="true" />
                    <button
                      className="task-row"
                      type="button"
                      role="menuitem"
                      aria-current={isSelected ? "page" : undefined}
                      onClick={() => setSelectedRow({ kind: "task", taskIndex: index })}
                    >
                      <span className="tree-row__selection-indicator" aria-hidden="true">
                        <span className={`system-dot task-row__selection-dot ${isSelected ? "is-visible" : ""}`} />
                      </span>
                      <span>{item}</span>
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
              variants={{
                closed: { x: -400, opacity: 0 },
                open: { x: 0, opacity: 1 },
              }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              <div className="search-popover__field">
                <FigmaIcon name="search" size={20} />
                <input autoFocus placeholder={t("搜索历史任务或项目")} />
                <IconControl
                  size="small"
                  label={t("关闭搜索")}
                  tooltipPlacement="left"
                  onClick={() => setSearchOpen(false)}
                >
                  <FigmaIcon name="close" size={16} />
                </IconControl>
              </div>
              <p className="search-popover__label">{t("最近编辑")}</p>
              <div className="search-popover__list">
                {recentItems.map(([title, meta], index) => (
                  <button type="button" key={`${title}-${index}`}>
                    <strong>{title}</strong>
                    <span>{meta}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </aside>

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
              <p>{t("删除后不可恢复，您确定删除吗？")}</p>
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
