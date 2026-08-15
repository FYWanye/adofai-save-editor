import type { GameSave } from "../utils/levels";
import { computeStats } from "../utils/levels";

export function StatsGrid({ data }: { data: GameSave }) {
  const s = computeStats(data);

  const items: [string, string][] = [
    ["关卡完成度", `${s.completed}/${s.total}`],
    ["飚速关卡数", String(s.speedCount)],
    ["飚速最高倍率", s.speedCount > 0 ? `${s.maxSpeed}x` : "N/A"],
    ["当前关卡", s.currentLevel],
  ];

  return (
    <section className="card">
      <h2 className="card-title">存档概览</h2>
      <div className="stats-grid">
        {items.map(([label, value]) => (
          <div className="stat" key={label}>
            <span className="stat-label">{label}</span>
            <span className="stat-value">{value}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
