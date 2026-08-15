import { useCallback, useState } from "react";
import type { GameSave } from "../utils/levels";
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

  return { data, filePath, toast, show, autoLoad, open, applyLevel, save, saveAs };
}
