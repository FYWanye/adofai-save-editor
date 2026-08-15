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

// ===== 云同步（云端 JSON 文件） =====

export const cloudFetch = () => invoke<Record<string, string>>("cloud_fetch");

export const getCloudUrl = () => invoke<string>("get_cloud_url");

export const setCloudUrl = (url: string) => invoke<void>("set_cloud_url", { url });

export const cloudOpen = (url: string) => invoke<void>("cloud_open", { url });

export interface CloudSettingsView {
  hasToken: boolean;
}

export const getCloudSettings = () =>
  invoke<CloudSettingsView>("get_cloud_settings");

export const setCloudSettings = (token: string) =>
  invoke<void>("set_cloud_settings", { token });

export const cloudPush = (content: string) =>
  invoke<void>("cloud_push", { content });
