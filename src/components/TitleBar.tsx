import { useTheme } from "../hooks/useTheme";

export function TitleBar({ title }: { title: string }) {
  const { theme, toggle } = useTheme();

  return (
    <header className="titlebar" data-tauri-drag-region>
      <span className="titlebar-title" data-tauri-drag-region>
        {title}
      </span>
      <div className="titlebar-actions">
        <button className="icon-btn" onClick={toggle} title="切换深浅色模式">
          {theme === "dark" ? "☀️" : "🌙"}
        </button>
      </div>
    </header>
  );
}
