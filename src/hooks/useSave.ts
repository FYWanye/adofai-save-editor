import { useCallback, useEffect, useState } from "react";
import type { GameSave } from "../utils/levels";
import { setCustomName } from "../utils/levels";
import { fetchCloudNames, submitCloudName } from "../utils/cloudNames";
import {
  autoDetectSave,
  openSaveDialog,
  saveSave,
  saveSaveAs,
  type SaveFile,
} from "../utils/ipc";

export type ToastTone = "success" | "error" | "info";
export interface ToastState {
  message: string;
  tone: ToastTone;
}

export function useSave() {
  const [data, setData] = useState<GameSave | null>(null);
  const [filePath, setFilePath] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [cloudNames, setCloudNames] = useState<Record<string, string>>({});

  // 启动时拉取云名称（服务器未就绪时返回空）
  useEffect(() => {
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
      } catch (e) {
        show(`解析失败: ${(e as Error).message}`, "error");
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

  // 重命名关卡：写入存档自定义名称，并同步提交到服务器（框架）
  const renameLevel = useCallback((num: string, name: string) => {
    setData((prev) => (prev ? setCustomName(prev, num, name) : prev));
    submitCloudName(num, name).catch(() => {});
  }, []);

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

  return {
    data,
    filePath,
    toast,
    cloudNames,
    show,
    autoLoad,
    open,
    applyLevel,
    renameLevel,
    save,
    saveAs,
  };
}
