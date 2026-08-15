import { useEffect, useMemo, useState } from "react";
import { useSave } from "./hooks/useSave";
import { collectLevels } from "./utils/levels";
import { TitleBar } from "./components/TitleBar";
import { StatsGrid } from "./components/StatsGrid";
import { LevelList } from "./components/LevelList";
import { LevelEditor } from "./components/LevelEditor";
import { Toast } from "./components/Toast";

export default function App() {
  const { data, filePath, toast, customNames, cloudNames, show, autoLoad, open, applyLevel, renameLevel, save, saveAs } =
    useSave();
  const [selected, setSelected] = useState<string | null>(null);

  const levels = useMemo(
    () => (data ? collectLevels(data, customNames, cloudNames) : []),
    [data, customNames, cloudNames],
  );
  const selectedLevel = useMemo(
    () => levels.find((l) => l.num === selected) ?? null,
    [levels, selected],
  );

  useEffect(() => {
    autoLoad();
  }, [autoLoad]);

  return (
    <div className="app">
      <TitleBar title="Adofai 存档修改器" />

      <main className="content">
        <section className="card">
          <div className="file-row">
            <span className="file-icon">📂</span>
            <span className="file-path">{filePath ?? "尚未选择存档文件"}</span>
            <button className="btn secondary" onClick={open}>
              浏览文件
            </button>
          </div>
        </section>

        {data && <StatsGrid data={data} />}

        {data && (
          <section className="card">
            <h2 className="card-title">关卡编辑器</h2>
            <div className="editor-layout">
              <LevelList
                levels={levels}
                selected={selected}
                onSelect={setSelected}
                onRename={renameLevel}
              />
              <LevelEditor
                key={selected ?? "empty"}
                level={selectedLevel}
                onApply={applyLevel}
                onNotify={(m) => show(m)}
              />
            </div>
          </section>
        )}
      </main>

      {data && (
        <footer className="save-bar">
          <button className="btn primary" onClick={save}>
            保存修改
          </button>
          <button className="btn secondary" onClick={saveAs}>
            另存为
          </button>
        </footer>
      )}

      {toast && <Toast toast={toast} />}
    </div>
  );
}
