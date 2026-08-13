import { lazy, Suspense, useLayoutEffect, useState } from "react";
import { Sidebar } from "./components/Sidebar";
import { TopBar } from "./components/TopBar";
import { Workspace } from "./components/Workspace";
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
  workflow: "new-product" | "default" | "apparel";
  status: "running";
};

export default function App() {
  const appShellRef = useGsapStaggerEntrance<HTMLDivElement>(".topbar, .sidebar", { y: -8 });
  const [theme, setTheme] = useState<Theme>("dark");
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [activeView, setActiveView] = useState<"workspace" | "preferences">("workspace");
  const [selectedProfile, setSelectedProfile] = useState<SelectedProfile | null>(null);
  const [selectedProject, setSelectedProject] = useState<SelectedProject | null>(null);
  const [taskRecords, setTaskRecords] = useState<TaskRecord[]>([]);
  const [activeTaskId, setActiveTaskId] = useState<number | null>(null);
  const [newTaskKey, setNewTaskKey] = useState(0);
  const activeTask = taskRecords.find((task) => task.id === activeTaskId) ?? null;

  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  }, [theme]);

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
          activeView={activeView}
          activeTaskId={activeTaskId}
          onOpenWorkspace={() => {
            setActiveView("workspace");
            setActiveTaskId(null);
            setNewTaskKey((value) => value + 1);
          }}
          onOpenPreferences={() => setActiveView("preferences")}
          onCreateTaskInProject={(project) => {
            setSelectedProject(project);
            setActiveTaskId(null);
            setNewTaskKey((value) => value + 1);
            setActiveView("workspace");
          }}
          createdTask={taskRecords[0] ?? null}
          onOpenTask={(taskId) => {
            setActiveTaskId(taskId);
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
        />
        {activeView === "preferences" ? (
          <Suspense fallback={<main className="workspace-region" aria-busy="true" />}>
            <BusinessProfile
              onCreateTask={(profile) => {
                setSelectedProfile({ id: profile.id, name: profile.name });
                setActiveTaskId(null);
                setNewTaskKey((value) => value + 1);
                setActiveView("workspace");
              }}
            />
          </Suspense>
        ) : (
          <Workspace
            theme={theme}
            activeTask={activeTask}
            newTaskKey={newTaskKey}
            selectedProfile={selectedProfile}
            onSelectedProfileChange={setSelectedProfile}
            selectedProject={selectedProject}
            onSelectedProjectChange={setSelectedProject}
            onCreateTask={({ title, projectId, prompt, workflow, attachments }) => {
              const id = Date.now();
              const task: TaskRecord = {
                id,
                title,
                projectId,
                prompt,
                profileName: selectedProfile?.name,
                attachments,
                workflow,
                status: "running",
              };
              setTaskRecords((current) => [task, ...current]);
              setActiveTaskId(id);
            }}
          />
        )}
      </div>
    </div>
    </I18nProvider>
  );
}
