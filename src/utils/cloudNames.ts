/**
 * 云名称服务框架
 * ===============
 * 用于「提交关卡名称到服务器 / 从服务器拉取关卡名称」。
 * 服务器尚未就绪，当前为空实现；接入时只需：
 *   1. 填写 CLOUD_API_BASE；
 *   2. 按注释实现 fetchCloudNames / submitCloudName 的真实请求。
 */

/** 服务器地址（待接入，留空表示未配置） */
export const CLOUD_API_BASE = "";

/** 从服务器拉取关卡云名称（num -> name） */
export async function fetchCloudNames(): Promise<Record<string, string>> {
  if (!CLOUD_API_BASE) return {};
  // TODO: 接入真实 API，例如：
  // const res = await fetch(`${CLOUD_API_BASE}/api/level-names`);
  // if (!res.ok) throw new Error(`拉取云名称失败: ${res.status}`);
  // return (await res.json()) as Record<string, string>;
  return {};
}

/** 提交关卡名称到服务器 */
export async function submitCloudName(levelNum: string, name: string): Promise<void> {
  if (!CLOUD_API_BASE) return;
  // TODO: 接入真实 API，例如：
  // await fetch(`${CLOUD_API_BASE}/api/level-names`, {
  //   method: "POST",
  //   headers: { "Content-Type": "application/json" },
  //   body: JSON.stringify({ levelNum, name }),
  // });
}
