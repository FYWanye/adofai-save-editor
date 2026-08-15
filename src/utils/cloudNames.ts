/**
 * 云名称服务（基于云端 JSON 文件）
 * =================================
 * 云端数据由作者手动维护并上传到 GitHub 仓库（cloud/levelNames.json），
 * 程序启动时自动下载该 JSON，并与用户本地自定义名称合并。
 * 显示优先级：本地自定义 > 云端 > 游戏内置 > 回退名，
 * 因此本地自定义永远不会被云端覆盖。
 */

import {
  cloudFetch,
  cloudOpen,
  cloudPush,
  getCloudSettings,
  getCloudUrl,
  setCloudSettings,
  setCloudUrl,
  type CloudSettingsView,
} from "./ipc";

export type { CloudSettingsView };

/** 拉取当前云端数据地址 */
export const fetchCloudUrl = () => getCloudUrl();

/** 保存云端数据地址 */
export const updateCloudUrl = (url: string) => setCloudUrl(url);

/** 拉取开发者云配置（不含 token） */
export const fetchCloudSettings = () => getCloudSettings();

/** 保存开发者 Token（留空保留旧值） */
export const updateCloudSettings = (token: string) => setCloudSettings(token);

/** 从云端下载关卡名称（num -> name） */
export async function fetchCloudNames(): Promise<Record<string, string>> {
  return await cloudFetch();
}

/** 推送 JSON 内容到云端（开发者用） */
export const pushCloudContent = (content: string) => cloudPush(content);

/** 在 App 内打开指定网页 */
export const openCloudPage = (url: string) => cloudOpen(url);
