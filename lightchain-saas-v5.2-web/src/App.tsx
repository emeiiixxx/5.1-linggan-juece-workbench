import { Activity, lazy, Suspense, useLayoutEffect, useState } from "react";
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

const workflowPageTitles: Record<TaskRecord["workflow"], string> = {
  "new-product": "新品企划",
  default: "客户提案",
  apparel: "服装设计",
  pattern: "图案设计",
  plan: "企划案",
};

const resolveTaskSourceLabel = (task: TaskRecord): TaskSourceLabel => {
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
  const [theme, setTheme] = useState<Theme>("dark");
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [activeView, setActiveView] = useState<"workspace" | "preferences">("workspace");
  const [selectedProfile, setSelectedProfile] = useState<SelectedProfile | null>(null);
  const [selectedProject, setSelectedProject] = useState<SelectedProject | null>(null);
  const [createdProjects, setCreatedProjects] = useState<SelectedProject[]>([]);
  const [taskRecords, setTaskRecords] = useState<TaskRecord[]>(allDemoTaskExamples);
  const [activeTaskId, setActiveTaskId] = useState<number | null>(null);
  const [newTaskKey, setNewTaskKey] = useState(0);
  const [createProfileRequestKey, setCreateProfileRequestKey] = useState(0);
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
    const updatedAt = new Date().toISOString();
    setTaskRecords((current) => current.map((task) => {
      if (task.id === activeTaskId && task.id !== nextTaskId && task.status === "running") {
        return { ...task, status: "pending", updatedAt };
      }
      return task;
    }));
  };

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
            setActiveView("workspace");
            setActiveTaskId(null);
            setNewTaskKey((value) => value + 1);
          }}
          onOpenPreferences={() => {
            transitionTaskFocus(null);
            setActiveTaskId(null);
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
          onCreateTaskInProject={(project) => {
            transitionTaskFocus(null);
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
              onCreateTask={(profile) => {
                transitionTaskFocus(null);
                setSelectedProfile({ id: profile.id, name: profile.name });
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
            taskIds={taskRecords.map((task) => task.id)}
            newTaskKey={newTaskKey}
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
                task.id === taskId ? { ...task, status, updatedAt } : task,
              ));
            }}
            onCreateTask={({ title, projectId, prompt, workflow, sourceLabel, attachments }) => {
              const id = Date.now();
              const task: TaskRecord = {
                id,
                title,
                projectId,
                prompt,
                profileName: selectedProfile?.name,
                attachments,
                workflow,
                sourceLabel,
                status: "running",
                updatedAt: new Date().toISOString(),
              };
              setTaskRecords((current) => [
                task,
                ...current.map((currentTask) =>
                  currentTask.id === activeTaskId && currentTask.status === "running"
                    ? { ...currentTask, status: "pending" as const, updatedAt: task.updatedAt }
                    : currentTask,
                ),
              ]);
              setActiveTaskId(id);
            }}
          />
        </Activity>
      </div>
    </div>
    </I18nProvider>
  );
}
