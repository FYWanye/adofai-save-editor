import { useRef, useState } from "react";
import type { Level, LevelStatus } from "../utils/levels";

const STATUS_LABEL: Record<LevelStatus, string> = {
  completed: "已完成",
  in_progress: "进行中",
  unplayed: "未完成",
};

interface Props {
  level: Level;
  selected: boolean;
  onSelect: (num: string) => void;
  onRename: (num: string, name: string) => void;
}

export function LevelItem({ level, selected, onSelect, onRename }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(level.name);
  const doneRef = useRef(false);

  const beginEdit = () => {
    setDraft(level.name);
    doneRef.current = false;
    setEditing(true);
  };

  const commit = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    setEditing(false);
    const trimmed = draft.trim();
    if (trimmed && trimmed !== level.name) onRename(level.num, trimmed);
  };

  const cancel = () => {
    doneRef.current = true;
    setEditing(false);
    setDraft(level.name);
  };

  return (
    <div
      className={"level-row" + (selected ? " selected" : "") + (level.boost ? " boost" : "")}
      onClick={() => onSelect(level.num)}
    >
      <div className="level-main" onDoubleClick={beginEdit} title="双击重命名">
        {editing ? (
          <input
            className="rename-input"
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit();
              if (e.key === "Escape") cancel();
            }}
          />
        ) : (
          <div className="level-name">{level.name}</div>
        )}
        <div className="level-num">#{level.num}</div>
      </div>
      <div className="level-side">
        <span className={"status-badge " + level.status}>{STATUS_LABEL[level.status]}</span>
        {level.boost && level.speed != null && (
          <span className="boost-badge">🔥 飙速 {level.speed}x</span>
        )}
      </div>
    </div>
  );
}
