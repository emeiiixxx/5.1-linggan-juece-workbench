import { Activity, lazy, Suspense, useEffect, useLayoutEffect, useState } from "react";
import { Sidebar } from "./components/Sidebar";
import { TopBar } from "./components/TopBar";
import { Workspace } from "./components/Workspace";
import {
  allDemoTaskExamples,
  taskWorkflowLabels,
  type TaskSourceLabel,
  type TaskStatus,
  type TaskWorkflow,
} from "./data/workspace";
import { I18nProvider } from "./i18n";
import { useGsapStaggerEntrance } from "./motion/gsap";

const BusinessProfile = lazy(() =>
  import("./components/BusinessProfile").then(({ BusinessProfile }) => ({ default: BusinessProfile })),
);

type Theme = "dark" | "light";
type ProfileTaskType = "new-product" | "customer-proposal";
type SelectedProfile = { id: number; name: string };
type SelectedProject = { id: number; name: string };
type TaskRecord = {
  id: number;
  title: string;
  projectId: number | null;
  prompt: string;
  profileName?: string;
  attachments?: { name: string; previewUrl?: string }[];
  workflow: TaskWorkflow;
  sourceLabel?: TaskSourceLabel | "灵感设计";
  status: TaskStatus;
  updatedAt: string;
  initialState?: "default" | "confirmation" | "complete" | "exception";
};

type PersistedWorkspaceState = {
  version: 1;
  theme: Theme;
  sidebarExpanded: boolean;
  selectedProfile: SelectedProfile | null;
  selectedProject: SelectedProject | null;
  createdProjects: SelectedProject[];
  taskRecords: TaskRecord[];
  activeTaskId: number | null;
};

const WORKSPACE_STORAGE_KEY = "lightchain:v5.2:workspace";

const readPersistedWorkspace = (): PersistedWorkspaceState | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(WORKSPACE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PersistedWorkspaceState>;
    if (parsed.version !== 1 || !Array.isArray(parsed.taskRecords)) return null;
    return parsed as PersistedWorkspaceState;
  } catch {
    return null;
  }
};

const stripTransientAttachmentUrls = (tasks: TaskRecord[]) => tasks.map((task) => ({
  ...task,
  attachments: task.attachments?.map(({ name }) => ({ name })),
}));

const mergePersistedTasksWithDemoDetails = (persistedTasks?: TaskRecord[]): TaskRecord[] => {
  if (!persistedTasks) return [...allDemoTaskExamples];

  const persistedTaskIds = new Set(persistedTasks.map((task) => task.id));
  const persistedTaskTitles = new Set(persistedTasks.map((task) => task.title));
  const missingDemoTasks = allDemoTaskExamples.filter((task) =>
    !persistedTaskIds.has(task.id) && !persistedTaskTitles.has(task.title));

  return [...persistedTasks, ...missingDemoTasks];
};

const workflowPageTitles: Record<TaskRecord["workflow"], string> = {
  "new-product": "新品企划",
  default: "客户提案",
  apparel: "服装设计",
  pattern: "图案设计",
  plan: "主题企划",
};

const resolveTaskSourceLabel = (task: TaskRecord): TaskSourceLabel => {
  if ((task.sourceLabel as string | undefined) === "企划案") return "主题企划";
  if (task.sourceLabel === "灵感设计") {
    return /图案|印花|纹样|花型/.test(task.prompt) ? "图案设计" : "服装设计";
  }
  if (task.sourceLabel) return task.sourceLabel;
  if (task.workflow === "default" && /图案|印花|纹样|花型/.test(task.prompt)) return "图案设计";
  return taskWorkflowLabels[task.workflow];
};

const resolveTaskWorkflow = (task: TaskRecord): TaskWorkflow => {
  const sourceLabel = resolveTaskSourceLabel(task);
  if (sourceLabel === "图案设计") return "pattern";
  if (task.workflow === "default" && sourceLabel === "服装设计") return "apparel";
  return task.workflow;
};

export default function App() {
  const appShellRef = useGsapStaggerEntrance<HTMLDivElement>(".topbar, .sidebar", { y: -8 });
  const [initialWorkspace] = useState(readPersistedWorkspace);
  const [theme, setTheme] = useState<Theme>(initialWorkspace?.theme ?? "dark");
  const [sidebarExpanded, setSidebarExpanded] = useState(initialWorkspace?.sidebarExpanded ?? true);
  const [activeView, setActiveView] = useState<"workspace" | "preferences">("workspace");
  const [selectedProfile, setSelectedProfile] = useState<SelectedProfile | null>(initialWorkspace?.selectedProfile ?? null);
  const [selectedProject, setSelectedProject] = useState<SelectedProject | null>(initialWorkspace?.selectedProject ?? null);
  const [createdProjects, setCreatedProjects] = useState<SelectedProject[]>(initialWorkspace?.createdProjects ?? []);
  const [taskRecords, setTaskRecords] = useState<TaskRecord[]>(() =>
    mergePersistedTasksWithDemoDetails(initialWorkspace?.taskRecords));
  const [activeTaskId, setActiveTaskId] = useState<number | null>(initialWorkspace?.activeTaskId ?? null);
  const [homeEntryKey, setHomeEntryKey] = useState(0);
  const [newTaskKey, setNewTaskKey] = useState(0);
  const [newTaskWorkflow, setNewTaskWorkflow] = useState<"new-product" | "default" | null>(null);
  const [createProfileRequestKey, setCreateProfileRequestKey] = useState(0);
  const [profileListRequestKey, setProfileListRequestKey] = useState(0);
  const [createProjectRequestKey, setCreateProjectRequestKey] = useState(0);
  const resolvedTaskRecords = taskRecords.map((task) => ({
    ...task,
    workflow: resolveTaskWorkflow(task),
    sourceLabel: resolveTaskSourceLabel(task),
  }));
  const activeTask = resolvedTaskRecords.find((task) => task.id === activeTaskId) ?? null;
  const sidebarPageTitle = activeView === "preferences"
    ? "业务偏好档案"
    : activeTask
      ? workflowPageTitles[activeTask.workflow]
      : "灵感决策工作台";
  const transitionTaskFocus = (nextTaskId: number | null) => {
    if (activeTaskId !== null && nextTaskId === null) {
      setHomeEntryKey((value) => value + 1);
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const persistedState: PersistedWorkspaceState = {
      version: 1,
      theme,
      sidebarExpanded,
      selectedProfile,
      selectedProject,
      createdProjects,
      taskRecords: stripTransientAttachmentUrls(taskRecords),
      activeTaskId,
    };
    try {
      window.localStorage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(persistedState));
    } catch {
      // The prototype remains usable when storage is unavailable or full.
    }
  }, [activeTaskId, createdProjects, selectedProfile, selectedProject, sidebarExpanded, taskRecords, theme]);

  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  }, [theme]);

  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [activeTaskId, activeView]);

  return (
    <I18nProvider>
    <div className="app-shell" ref={appShellRef}>
      <TopBar
        theme={theme}
        onToggleTheme={() => setTheme((value) => (value === "dark" ? "light" : "dark"))}
      />
      <div className={`app-body ${sidebarExpanded ? "sidebar-expanded" : "sidebar-collapsed"}`}>
        <Sidebar
          expanded={sidebarExpanded}
          onToggle={() => setSidebarExpanded((value) => !value)}
          pageTitle={sidebarPageTitle}
          activeView={activeView}
          activeTaskId={activeTaskId}
          onOpenWorkspace={() => {
            transitionTaskFocus(null);
            setNewTaskWorkflow(null);
            setActiveView("workspace");
            setActiveTaskId(null);
            setNewTaskKey((value) => value + 1);
          }}
          onStartNewTask={() => {
            transitionTaskFocus(null);
            setNewTaskWorkflow(null);
            setActiveView("workspace");
            setActiveTaskId(null);
            setNewTaskKey((value) => value + 1);
          }}
          onOpenPreferences={() => {
            transitionTaskFocus(null);
            setActiveTaskId(null);
            setProfileListRequestKey((value) => value + 1);
            setActiveView("preferences");
          }}
          createProjectRequestKey={createProjectRequestKey}
          onProjectCreated={(project) => {
            setCreatedProjects((current) => [
              project,
              ...current.filter((item) => item.id !== project.id),
            ]);
            setSelectedProject(project);
          }}
          createdProjects={createdProjects}
          onCreateTaskInProject={(project) => {
            transitionTaskFocus(null);
            setNewTaskWorkflow(null);
            setSelectedProject(project);
            setActiveTaskId(null);
            setNewTaskKey((value) => value + 1);
            setActiveView("workspace");
          }}
          createdTask={resolvedTaskRecords.find((task) => task.status === "running") ?? null}
          taskRecords={resolvedTaskRecords}
          onOpenTask={(taskId) => {
            transitionTaskFocus(taskId);
            setActiveTaskId(taskId);
            setActiveView("workspace");
          }}
          onSelectStaticRow={() => {
            transitionTaskFocus(null);
            setActiveTaskId(null);
            setActiveView("workspace");
          }}
          onDeleteTask={(taskId) => {
            setTaskRecords((current) => current.filter((task) => task.id !== taskId));
            if (activeTaskId === taskId) {
              setActiveTaskId(null);
              setActiveView("workspace");
              setNewTaskWorkflow(null);
              setNewTaskKey((value) => value + 1);
            }
          }}
          onMoveTask={(taskId, projectId) => {
            setTaskRecords((current) => current.map((task) =>
              task.id === taskId ? { ...task, projectId } : task,
            ));
          }}
          onDeleteProject={(projectId) => {
            setCreatedProjects((current) => current.filter((project) => project.id !== projectId));
            setSelectedProject((current) => current?.id === projectId ? null : current);
          }}
        />
        <Activity mode={activeView === "preferences" ? "visible" : "hidden"} name="business-profile">
          <Suspense fallback={<main className="workspace-region" aria-busy="true" />}>
            <BusinessProfile
              createRequestKey={createProfileRequestKey}
              listRequestKey={profileListRequestKey}
              onCreateTask={(profile, taskType: ProfileTaskType) => {
                transitionTaskFocus(null);
                setSelectedProfile({ id: profile.id, name: profile.name });
                setNewTaskWorkflow(taskType === "new-product" ? "new-product" : "default");
                setActiveTaskId(null);
                setNewTaskKey((value) => value + 1);
                setActiveView("workspace");
              }}
            />
          </Suspense>
        </Activity>
        <Activity mode={activeView === "workspace" ? "visible" : "hidden"} name="workspace">
          <Workspace
            theme={theme}
            active={activeView === "workspace"}
            activeTask={activeTask}
            tasks={resolvedTaskRecords}
            homeEntryKey={homeEntryKey}
            onHomeReentry={() => setHomeEntryKey((value) => value + 1)}
            newTaskKey={newTaskKey}
            newTaskWorkflow={newTaskWorkflow}
            selectedProfile={selectedProfile}
            onSelectedProfileChange={setSelectedProfile}
            onCreateProfile={() => {
              transitionTaskFocus(null);
              setActiveTaskId(null);
              setCreateProfileRequestKey((value) => value + 1);
              setActiveView("preferences");
            }}
            selectedProject={selectedProject}
            createdProjects={createdProjects}
            onSelectedProjectChange={setSelectedProject}
            onCreateProject={() => setCreateProjectRequestKey((value) => value + 1)}
            onTaskStatusChange={(taskId, status) => {
              const updatedAt = new Date().toISOString();
              setTaskRecords((current) => current.map((task) =>
                task.id === taskId
                  ? {
                      ...task,
                      status,
                      updatedAt,
                      initialState: status === "completed" ? "complete" : task.initialState,
                    }
                  : task,
              ));
            }}
            onCreateTask={({ title, projectId, prompt, workflow, sourceLabel, attachments }) => {
              const id = Date.now();
              const task: TaskRecord = {
                id,
                title,
                projectId,
                prompt,
                profileName: workflow === "new-product" || workflow === "default" ? selectedProfile?.name : undefined,
                attachments,
                workflow,
                sourceLabel,
                status: "running",
                updatedAt: new Date().toISOString(),
              };
              setTaskRecords((current) => [
                task,
                ...current,
              ]);
              setActiveTaskId(id);
              return true;
            }}
          />
        </Activity>
      </div>
    </div>
    </I18nProvider>
  );
}
