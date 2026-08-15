export type GameSave = Record<string, unknown>;

export type LevelStatus = "completed" | "in_progress" | "unplayed";

export interface Level {
  num: string;
  numInt: number;
  name: string;
  progress: boolean;
  status: LevelStatus;
  accuracy: number | null;
  xAccuracy: number | null;
  attempts: number | null;
  tutorial: number | null;
  speed: number | null;
  boost: boolean;
}

const numVal = (v: unknown): number | null => (typeof v === "number" ? v : null);

/** 解析关卡名称，优先级：自定义 > 云名称 > 存档内置 > 回退「关卡 N」 */
function resolveLevelName(
  data: GameSave,
  custom: Record<string, string>,
  cloud: Record<string, string>,
  num: string,
): string {
  if (custom[num]) return custom[num];
  if (cloud[num]) return cloud[num];
  for (const prefix of ["levelName", "levelTitle", "name"]) {
    const v = data[prefix + num];
    if (typeof v === "string" && v.trim()) return v;
  }
  const n = parseInt(num, 10);
  return Number.isFinite(n) ? `关卡 ${n + 1}` : `关卡 ${num}`;
}

/** 收集所有普通关卡数据 */
export function collectLevels(
  data: GameSave,
  customNames: Record<string, string> = {},
  cloudNames: Record<string, string> = {},
): Level[] {
  const levels: Level[] = [];
  for (const key of Object.keys(data)) {
    if (key.startsWith("percentCompletion") && !key.startsWith("coop_")) {
      const num = key.slice("percentCompletion".length);
      const progress = data[key] === 1;
      const attempts = numVal(data["worldAttempts" + num]);
      const speed = numVal(data["bestSpeedMultiplier" + num]);
      const status: LevelStatus = progress
        ? "completed"
        : attempts != null && attempts > 0
          ? "in_progress"
          : "unplayed";
      levels.push({
        num,
        numInt: parseInt(num, 10) || 0,
        name: resolveLevelName(data, customNames, cloudNames, num),
        progress,
        status,
        accuracy: numVal(data["bestPercentAccuracy" + num]),
        xAccuracy: numVal(data["bestPercentXAccuracy" + num]),
        attempts,
        tutorial: numVal(data["tutorialProgress" + num]),
        speed,
        boost: speed != null,
      });
    }
  }
  return levels;
}

/** 比例（1.0 = 100%）转百分比字符串 */
export const ratioToPercent = (r: number | null): string =>
  r == null ? "" : (r * 100).toFixed(2);

/** 百分比字符串转比例（保留 4 位小数，与存档精度一致） */
export const percentToRatio = (p: string): number =>
  Math.round(parseFloat(p) * 100) / 10000;

/**
 * 搜索匹配：支持状态关键词、飚速关键词、编号、名称模糊匹配
 *   - "已完成" / "done" / "completed"   → 已完成
 *   - "未完成" / "todo"                 → 未完成（含进行中）
 *   - "进行中" / "progress"             → 进行中
 *   - "飚速" / "boost" / "🔥" / "⚡"     → 飚速
 *   - "#123" / "123"                    → 编号
 *   - 其它                              → 名称/编号模糊匹配
 */
export function matchesSearch(level: Level, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;

  // 状态关键词
  if (["已完成", "完成", "done", "completed"].includes(q)) return level.status === "completed";
  if (["未完成", "todo", "uncompleted", "unfinished"].includes(q)) return level.status !== "completed";
  if (["进行中", "进行", "in progress", "progress"].includes(q)) return level.status === "in_progress";

  // 属性存在性关键词
  if (["精准度", "精度", "accuracy", "acc"].includes(q)) return level.accuracy != null;
  if (["x精准度", "x精度", "xaccuracy", "xacc"].includes(q)) return level.xAccuracy != null;
  if (["尝试", "尝试次数", "次数", "attempts", "attempt"].includes(q)) return level.attempts != null;
  if (["教程", "教程进度", "tutorial"].includes(q)) return level.tutorial != null;
  if (["飚速", "飙速", "倍率", "boost", "boosted", "speed", "🔥", "⚡"].includes(q)) return level.boost;

  // 编号匹配
  if (q.startsWith("#")) return level.num === q.slice(1);

  // 数值匹配：编号 / 尝试 / 教程 / 精准度% / X精准度% / 飚速倍率
  if (/^\d+(\.\d+)?$/.test(q)) {
    const n = parseFloat(q);
    if (Number.isInteger(n)) {
      if (level.numInt === n) return true;
      if (level.attempts === n) return true;
      if (level.tutorial === n) return true;
    }
    if (level.accuracy != null && Math.abs(level.accuracy * 100 - n) < 0.005) return true;
    if (level.xAccuracy != null && Math.abs(level.xAccuracy * 100 - n) < 0.005) return true;
    if (level.speed != null && Math.abs(level.speed - n) < 0.05) return true;
    return false;
  }

  // 名称 / 编号模糊匹配
  return level.name.toLowerCase().includes(q) || level.num.toLowerCase().includes(q);
}

/** 飚速倍率颜色（备用，低倍率偏蓝、高倍率偏红） */
export function speedColor(value: number): string {
  const v = Math.max(0.1, Math.min(value, 3.0));
  const hue = 210 - ((v - 0.1) / 2.9) * 210;
  return `hsl(${hue.toFixed(1)}, 85%, 62%)`;
}

export interface SaveStats {
  completed: number;
  total: number;
  speedCount: number;
  maxSpeed: number;
  currentLevel: string;
}

export function computeStats(data: GameSave): SaveStats {
  let completed = 0;
  let total = 0;
  for (const key of Object.keys(data)) {
    if (key.startsWith("percentCompletion") && !key.startsWith("coop_")) {
      total++;
      if (data[key] === 1) completed++;
    }
  }
  let speedCount = 0;
  let maxSpeed = 0;
  for (const key of Object.keys(data)) {
    if (key.startsWith("bestSpeedMultiplier")) {
      speedCount++;
      const v = numVal(data[key]);
      if (v != null && v > maxSpeed) maxSpeed = v;
    }
  }
  return {
    completed,
    total,
    speedCount,
    maxSpeed,
    currentLevel: typeof data.currentLevel === "string" ? data.currentLevel : "N/A",
  };
}

