import { useCallback, useEffect, useState } from "react";
import type { GameSave } from "../utils/levels";
import {
  fetchCloudNames,
  fetchCloudSettings,
  fetchCloudUrl,
  openCloudPage,
  pushCloudContent,
  updateCloudSettings,
} from "../utils/cloudNames";
import {
  autoDetectSave,
  openSaveDialog,
  saveSave,
  saveSaveAs,
  readLevelNames,
  writeLevelNames,
  type SaveFile,
} from "../utils/ipc";

export type ToastTone = "success" | "error" | "info";
export interface ToastState {
  message: string;
  tone: ToastTone;
}

/** 将 invoke 的 reject 值转成可读信息（Tauri 错误通常是字符串） */
const errMsg = (e: unknown): string =>
  typeof e === "string" ? e : e instanceof Error ? e.message : String(e);

export function useSave() {
  const [data, setData] = useState<GameSave | null>(null);
  const [filePath, setFilePath] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [customNames, setCustomNames] = useState<Record<string, string>>({});
  const [cloudNames, setCloudNames] = useState<Record<string, string>>({});
  const [cloudUrl, setCloudUrl] = useState("");
  const [cloudHasToken, setCloudHasToken] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // 启动时获取云端地址并自动下载云端名称（失败静默，不打扰用户）
  useEffect(() => {
    fetchCloudUrl()
      .then(setCloudUrl)
      .catch(() => {});
    fetchCloudSettings()
      .then((s) => setCloudHasToken(s.hasToken))
      .catch(() => {});
    fetchCloudNames()
      .then(setCloudNames)
      .catch(() => {});
  }, []);

  const show = useCallback((message: string, tone: ToastTone = "success") => {
    setToast({ message, tone });
    window.setTimeout(() => setToast(null), 3000);
  }, []);

  const applyFile = useCallback(
    (f: SaveFile) => {
      try {
        setData(JSON.parse(f.content) as GameSave);
        setFilePath(f.path);
        // 读取侧车自定义名称（独立文件，不污染存档）
        setCustomNames({});
        readLevelNames(f.path)
          .then((names) => setCustomNames(names ?? {}))
          .catch(() => {});
      } catch (e) {
        show(`解析失败: ${errMsg(e)}`, "error");
      }
    },
    [show],
  );

  const autoLoad = useCallback(async () => {
    const f = await autoDetectSave();
    if (f) {
      applyFile(f);
      show("已自动加载存档", "success");
    } else {
      show("未自动检测到存档，请手动打开", "info");
    }
  }, [applyFile, show]);

  const open = useCallback(async () => {
    const f = await openSaveDialog();
    if (f) {
      applyFile(f);
      show("文件加载成功", "success");
    }
  }, [applyFile, show]);

  const applyLevel = useCallback((patch: Record<string, unknown>) => {
    setData((prev) => (prev ? { ...prev, ...patch } : prev));
  }, []);

  // 重命名关卡：仅写入本地侧车文件（云端只读，不自动上传）
  const renameLevel = useCallback(
    (num: string, name: string) => {
      const trimmed = name.trim();
      const next = { ...customNames };
      if (trimmed) next[num] = trimmed;
      else delete next[num];
      setCustomNames(next);
      if (filePath) {
        writeLevelNames(filePath, next).catch(() => {});
      }
    },
    [customNames, filePath],
  );

  const save = useCallback(async () => {
    if (!data || !filePath) {
      show("请先打开存档文件", "error");
      return;
    }
    const r = await saveSave(filePath, JSON.stringify(data));
    if (r.success) show("保存成功，已创建备份", "success");
    else show(`保存失败: ${r.error}`, "error");
  }, [data, filePath, show]);

  const saveAs = useCallback(async () => {
    if (!data) {
      show("请先打开存档文件", "error");
      return;
    }
    const p = await saveSaveAs(JSON.stringify(data));
    if (p) show(`已保存到: ${p}`, "success");
  }, [data, show]);

  // 保存开发者 Token
  const saveCloudToken = useCallback(
    async (token: string) => {
      try {
        await updateCloudSettings(token);
        const s = await fetchCloudSettings();
        setCloudHasToken(s.hasToken);
        show("Token 已保存", "success");
      } catch (e) {
        show(`保存 Token 失败: ${errMsg(e)}`, "error");
      }
    },
    [show],
  );

  // 推送 JSON 到云端（开发者用）
  const pushToCloud = useCallback(
    async (content: string) => {
      setSyncing(true);
      try {
        await pushCloudContent(content);
        show("已推送到云端", "success");
      } catch (e) {
        show(`推送失败: ${errMsg(e)}`, "error");
      } finally {
        setSyncing(false);
      }
    },
    [show],
  );

  // 手动从云端拉取（下载后与本地合并，本地自定义优先）
  const pullCloud = useCallback(async () => {
    setSyncing(true);
    try {
      const names = await fetchCloudNames();
      setCloudNames(names);
      show(`已从云端拉取 ${Object.keys(names).length} 个名称`, "success");
    } catch (e) {
      show(`拉取失败: ${errMsg(e)}`, "error");
    } finally {
      setSyncing(false);
    }
  }, [show]);

  // 在 App 内打开 GitHub 页面
  const openCloud = useCallback(
    (url: string) => {
      openCloudPage(url).catch((e) => show(`打开失败: ${errMsg(e)}`, "error"));
    },
    [show],
  );

  return {
    data,
    filePath,
    toast,
    customNames,
    cloudNames,
    cloudUrl,
    cloudHasToken,
    syncing,
    show,
    autoLoad,
    open,
    applyLevel,
    renameLevel,
    save,
    saveAs,
    saveCloudToken,
    pushToCloud,
    pullCloud,
    openCloud,
  };
}
