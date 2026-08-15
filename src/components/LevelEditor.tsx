import { useState } from "react";
import type { Level } from "../utils/levels";
import { ratioToPercent } from "../utils/levels";

interface Props {
  level: Level | null;
  onApply: (patch: Record<string, unknown>) => void;
  onNotify: (message: string) => void;
}

/** 缺失字段的默认值（用于「补齐」） */
const DEFAULTS = {
  accuracy: "0.00",
  xAccuracy: "0.00",
  attempts: "0",
  tutorial: "0",
  speed: "1.0",
};

export function LevelEditor({ level, onApply, onNotify }: Props) {
  const [progress, setProgress] = useState(level?.progress ?? false);
  const [accuracy, setAccuracy] = useState(
    level && level.accuracy != null ? ratioToPercent(level.accuracy) : DEFAULTS.accuracy,
  );
  const [xAccuracy, setXAccuracy] = useState(
    level && level.xAccuracy != null ? ratioToPercent(level.xAccuracy) : DEFAULTS.xAccuracy,
  );
  const [attempts, setAttempts] = useState(
    level && level.attempts != null ? String(level.attempts) : DEFAULTS.attempts,
  );
  const [tutorial, setTutorial] = useState(
    level && level.tutorial != null ? String(level.tutorial) : DEFAULTS.tutorial,
  );
  const [speed, setSpeed] = useState(
    level && level.speed != null ? String(level.speed) : DEFAULTS.speed,
  );

  if (!level) {
    return (
      <div className="editor-panel">
        <div className="editor-empty">点击左侧关卡，在此编辑该关卡的属性</div>
      </div>
    );
  }

  const apply = () => {
    const n = level.num;

    const acc = parseFloat(accuracy);
    const xacc = parseFloat(xAccuracy);
    const att = parseInt(attempts, 10);
    const tut = parseInt(tutorial, 10);
    const spd = parseFloat(speed);

    const patch: Record<string, unknown> = {
      ["percentCompletion" + n]: progress ? 1 : 0,
      // 补齐缺失字段：非法/空值回退默认
      ["bestPercentAccuracy" + n]:
        Number.isFinite(acc) && acc >= 0 ? Math.round(acc * 100) / 10000 : 0,
      ["bestPercentXAccuracy" + n]:
        Number.isFinite(xacc) && xacc >= 0 ? Math.round(xacc * 100) / 10000 : 0,
      ["worldAttempts" + n]: Number.isFinite(att) && att >= 0 ? att : 0,
      ["tutorialProgress" + n]: Number.isFinite(tut) && tut >= 0 ? tut : 0,
      ["bestSpeedMultiplier" + n]:
        Number.isFinite(spd) && spd >= 0.1 ? Math.round(spd * 10) / 10 : 1.0,
    };
    onApply(patch);
    onNotify(`已应用关卡 #${n} 的修改`);
  };

  const reset = () => {
    setProgress(level.progress);
    setAccuracy(level.accuracy != null ? ratioToPercent(level.accuracy) : DEFAULTS.accuracy);
    setXAccuracy(level.xAccuracy != null ? ratioToPercent(level.xAccuracy) : DEFAULTS.xAccuracy);
    setAttempts(level.attempts != null ? String(level.attempts) : DEFAULTS.attempts);
    setTutorial(level.tutorial != null ? String(level.tutorial) : DEFAULTS.tutorial);
    setSpeed(level.speed != null ? String(level.speed) : DEFAULTS.speed);
  };

  return (
    <div className="editor-panel">
      <div className="editor-head">
        <span className="badge large">{level.num}</span>
        <div className="editor-title-wrap">
          <div className="title">{level.name}</div>
          <div className="subtitle">#{level.num}</div>
        </div>
      </div>

      <label className="field toggle">
        <span>进度（完成）</span>
        <input type="checkbox" checked={progress} onChange={(e) => setProgress(e.target.checked)} />
      </label>

      <label className="field">
        <span>精准度 (%)</span>
        <input
          type="number"
          step="0.01"
          min="0"
          value={accuracy}
          onChange={(e) => setAccuracy(e.target.value)}
        />
      </label>

      <label className="field">
        <span>X 精准度 (%)</span>
        <input
          type="number"
          step="0.01"
          min="0"
          value={xAccuracy}
          onChange={(e) => setXAccuracy(e.target.value)}
        />
      </label>

      <label className="field">
        <span>尝试次数</span>
        <input
          type="number"
          step="1"
          min="0"
          value={attempts}
          onChange={(e) => setAttempts(e.target.value)}
        />
      </label>

      <label className="field">
        <span>教程进度</span>
        <input
          type="number"
          step="1"
          min="0"
          value={tutorial}
          onChange={(e) => setTutorial(e.target.value)}
        />
      </label>

      <label className="field">
        <span>飚速倍率 (x)</span>
        <input
          type="number"
          step="0.1"
          min="0.1"
          value={speed}
          onChange={(e) => setSpeed(e.target.value)}
        />
      </label>

      <div className="editor-actions">
        <button className="btn primary" onClick={apply}>
          应用修改
        </button>
        <button className="btn secondary" onClick={reset}>
          还原
        </button>
      </div>
    </div>
  );
}
