import { useState } from "react";
import type { Level } from "../utils/levels";
import { ratioToPercent, percentToRatio } from "../utils/levels";

interface Props {
  level: Level | null;
  onApply: (patch: Record<string, unknown>) => void;
  onNotify: (message: string) => void;
}

export function LevelEditor({ level, onApply, onNotify }: Props) {
  const [progress, setProgress] = useState(level?.progress ?? false);
  const [accuracy, setAccuracy] = useState(ratioToPercent(level?.accuracy ?? null));
  const [xAccuracy, setXAccuracy] = useState(ratioToPercent(level?.xAccuracy ?? null));
  const [attempts, setAttempts] = useState(level?.attempts != null ? String(level.attempts) : "");
  const [tutorial, setTutorial] = useState(level?.tutorial != null ? String(level.tutorial) : "");
  const [speed, setSpeed] = useState(level?.speed != null ? String(level.speed) : "");

  if (!level) {
    return (
      <div className="editor-panel">
        <div className="editor-empty">点击左侧关卡，在此编辑该关卡的属性</div>
      </div>
    );
  }

  const apply = () => {
    const n = level.num;
    const patch: Record<string, unknown> = {
      ["percentCompletion" + n]: progress ? 1 : 0,
    };
    if (accuracy !== "") patch["bestPercentAccuracy" + n] = percentToRatio(accuracy);
    if (xAccuracy !== "") patch["bestPercentXAccuracy" + n] = percentToRatio(xAccuracy);
    if (attempts !== "") patch["worldAttempts" + n] = Math.max(0, parseInt(attempts, 10) || 0);
    if (tutorial !== "") patch["tutorialProgress" + n] = Math.max(0, parseInt(tutorial, 10) || 0);
    if (speed !== "") {
      const v = parseFloat(speed);
      if (!isNaN(v) && v >= 0.1) patch["bestSpeedMultiplier" + n] = Math.round(v * 10) / 10;
    }
    onApply(patch);
    onNotify(`已应用关卡 #${n} 的修改`);
  };

  const reset = () => {
    setProgress(level.progress);
    setAccuracy(ratioToPercent(level.accuracy));
    setXAccuracy(ratioToPercent(level.xAccuracy));
    setAttempts(level.attempts != null ? String(level.attempts) : "");
    setTutorial(level.tutorial != null ? String(level.tutorial) : "");
    setSpeed(level.speed != null ? String(level.speed) : "");
  };

  return (
    <div className="editor-panel">
      <div className="editor-head">
        <span className="badge large">{level.num}</span>
        <span className="title">#{level.num}</span>
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

      {level.tutorial != null && (
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
      )}

      {level.speed != null && (
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
      )}

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
