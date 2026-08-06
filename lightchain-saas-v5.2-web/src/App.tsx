import { useLayoutEffect, useState } from "react";
import { Sidebar } from "./components/Sidebar";
import { TopBar } from "./components/TopBar";
import { Workspace } from "./components/Workspace";

type Theme = "dark" | "light";

export default function App() {
  const [theme, setTheme] = useState<Theme>("light");
  const [sidebarExpanded, setSidebarExpanded] = useState(true);

  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  }, [theme]);

  return (
    <div className="app-shell">
      <TopBar
        theme={theme}
        onToggleTheme={() => setTheme((value) => (value === "dark" ? "light" : "dark"))}
      />
      <div className={`app-body ${sidebarExpanded ? "sidebar-expanded" : "sidebar-collapsed"}`}>
        <Sidebar expanded={sidebarExpanded} onToggle={() => setSidebarExpanded((value) => !value)} />
        <Workspace />
      </div>
    </div>
  );
}
