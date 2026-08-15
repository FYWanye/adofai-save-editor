import { useState } from "react";

interface CloudPanelProps {
  cloudUrl: string;
  syncing: boolean;
  cloudCount: number;
  customNames: Record<string, string>;
  hasToken: boolean;
  onPull: () => void;
  onOpen: (url: string) => void;
  onSaveToken: (token: string) => void;
  onPushContent: (content: string) => void;
}

export function CloudPanel({
  cloudUrl,
  syncing,
  cloudCount,
  customNames,
  hasToken,
  onPull,
  onOpen,
  onSaveToken,
  onPushContent,
}: CloudPanelProps) {
  const [token, setToken] = useState("");

  const localCount = Object.keys(customNames).length;
  const push = () => onPushContent(JSON.stringify(customNames, null, 2));

  return (
    <section className="card cloud-panel">
      <div className="cloud-head">
        <h2 className="card-title">云同步</h2>
        <span className={`cloud-status ${hasToken ? "ok" : "off"}`}>
          {hasToken ? "● 已配置" : "○ 未配置"}
        </span>
      </div>

      <p className="cloud-desc">
        已同步 {cloudCount} 个云端名称，每次启动自动下载；你自定义过的名称永远优先。
      </p>

      <div className="cloud-actions">
        <button className="btn link" onClick={onPull} disabled={syncing}>
          {syncing ? "更新中…" : "立即更新"}
        </button>
        <button className="btn link" onClick={() => onOpen(cloudUrl)} disabled={!cloudUrl}>
          打开云端数据
        </button>
      </div>

      <details className="cloud-dev">
        <summary>开发者设置</summary>

        <label className="cloud-field">
          <span>GitHub Token（留空保留旧值）</span>
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="github_pat_…"
            autoComplete="off"
          />
        </label>

        <div className="cloud-actions">
          <button className="btn secondary" onClick={() => onSaveToken(token)}>
            保存 Token
          </button>
        </div>

        <div className="cloud-actions">
          <button className="btn primary" onClick={push} disabled={syncing}>
            {syncing ? "推送中…" : `推送到云端（${localCount} 个名称）`}
          </button>
        </div>

        <p className="cloud-note">
          推送会自动把本地自定义名称生成为 JSON 并覆盖云端文件；Token 仅保存在本机。
        </p>
      </details>
    </section>
  );
}
