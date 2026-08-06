import { useLayoutEffect, useState } from "react";
import { Sidebar } from "./components/Sidebar";
import { TopBar } from "./components/TopBar";
import { Workspace } from "./components/Workspace";
import { BusinessProfile } from "./components/BusinessProfile";
import { I18nProvider } from "./i18n";

type Theme = "dark" | "light";
type SelectedProfile = { id: number; name: string };
type SelectedProject = { id: number; name: string };
type CreatedTask = { id: number; title: string; projectId: number | null };

export default function App() {
  const [theme, setTheme] = useState<Theme>("dark");
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [activeView, setActiveView] = useState<"workspace" | "preferences">("workspace");
  const [selectedProfile, setSelectedProfile] = useState<SelectedProfile | null>(null);
  const [selectedProject, setSelectedProject] = useState<SelectedProject | null>(null);
  const [createdTask, setCreatedTask] = useState<CreatedTask | null>(null);

  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  }, [theme]);

  return (
    <I18nProvider>
    <div className="app-shell">
      <TopBar
        theme={theme}
        onToggleTheme={() => setTheme((value) => (value === "dark" ? "light" : "dark"))}
      />
      <div className={`app-body ${sidebarExpanded ? "sidebar-expanded" : "sidebar-collapsed"}`}>
        <Sidebar
          expanded={sidebarExpanded}
          onToggle={() => setSidebarExpanded((value) => !value)}
          activeView={activeView}
          onOpenWorkspace={() => setActiveView("workspace")}
          onOpenPreferences={() => setActiveView("preferences")}
          createdTask={createdTask}
        />
        {activeView === "preferences" ? (
          <BusinessProfile
            onCreateTask={(profile) => {
              setSelectedProfile({ id: profile.id, name: profile.name });
              setActiveView("workspace");
            }}
          />
        ) : (
          <Workspace
            theme={theme}
            selectedProfile={selectedProfile}
            onSelectedProfileChange={setSelectedProfile}
            selectedProject={selectedProject}
            onSelectedProjectChange={setSelectedProject}
            onCreateTask={({ title, projectId }) => {
              setCreatedTask({ id: Date.now(), title, projectId });
            }}
          />
        )}
      </div>
    </div>
    </I18nProvider>
  );
}
