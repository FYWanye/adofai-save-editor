import { invoke } from "@tauri-apps/api/core";

export interface SaveFile {
  path: string;
  content: string;
}

export interface SaveResult {
  success: boolean;
  backupPath: string | null;
  error: string | null;
}

export const autoDetectSave = () => invoke<SaveFile | null>("auto_detect_save");

export const openSaveDialog = () => invoke<SaveFile | null>("open_save_dialog");

export const saveSave = (path: string, content: string) =>
  invoke<SaveResult>("save_save", { path, content });

export const saveSaveAs = (content: string) =>
  invoke<string | null>("save_save_as", { content });

export const readLevelNames = (savePath: string) =>
  invoke<Record<string, string> | null>("read_level_names", { savePath });

export const writeLevelNames = (savePath: string, names: Record<string, string>) =>
  invoke<void>("write_level_names", { savePath, names });
