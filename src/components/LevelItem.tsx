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
}

export function LevelItem({ level, selected, onSelect }: Props) {
  return (
    <div
      className={"level-row" + (selected ? " selected" : "") + (level.boost ? " boost" : "")}
      onClick={() => onSelect(level.num)}
    >
      <div className="level-main">
        <div className="level-name">{level.name}</div>
        <div className="level-num">#{level.num}</div>
      </div>
      <div className="level-side">
        <span className={"status-badge " + level.status}>{STATUS_LABEL[level.status]}</span>
        {level.boost && <span className="boost-badge">🔥 飙速</span>}
      </div>
    </div>
  );
}
