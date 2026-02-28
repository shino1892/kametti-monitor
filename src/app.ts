import "dotenv/config";

if (process.env.SOPIA_HTTP_DEBUG !== "1") {
  console.debug = () => {};
}

import { SpoonV2, Country, LogLevel } from "@sopia-bot/core";

// --- Discord通知用インターフェースの拡張 ---
// message だけでなく、オプションで liveId も受け取れるように変更
export type NotifyHandler = (message: string, liveId?: number) => void;
let notifyHandler: NotifyHandler = (msg) => console.log(`[Log] ${msg}`);
export const setNotifyHandler = (handler: NotifyHandler) => {
  notifyHandler = handler;
};

export let pendingLiveId: number | null = null;
export let spoonClient: SpoonV2 | null = null;

const TOKEN_REFRESH_BACKOFF_MS = Number(process.env.TOKEN_REFRESH_BACKOFF_MS || "300000");
let tokenRefreshBackoffUntil = 0;
const SPOON_HTTP_ANOMALY_BACKOFF_MS = Number(process.env.SPOON_HTTP_ANOMALY_BACKOFF_MS || "600000");

const CONFIG = {
  DJ_ID: process.env.DJ_ID!,
  CHECK_INTERVAL_MS: Number(process.env.CHECK_INTERVAL || "5000"),
  DIAG_DETECT: process.env.DIAG_DETECT === "1",
};

async function initSpoon() {
  const client = new SpoonV2(Country.JAPAN, { logLevel: LogLevel.WARN });
  await client.init();

  const accessToken = process.env.ACCESS_TOKEN;
  const refreshToken = process.env.REFRESH_TOKEN;
  if (!accessToken || !refreshToken) throw new Error("ACCESS_TOKEN / REFRESH_TOKEN が不足しています。");

  await client.setToken(accessToken, refreshToken);
  spoonClient = client;

  const me: any = (client as any).logonUser;
  console.log(`👤 ログイン完了: ${me?.nickname} (${me?.id})`);
  return client;
}

async function detectLoop(client: SpoonV2) {
  if (tokenRefreshBackoffUntil && Date.now() < tokenRefreshBackoffUntil) return;

  try {
    const djId = Number(CONFIG.DJ_ID);
    let liveId = 0;
    const now = Date.now();
    const state = detectLoop as any;

    // --- 各ルートでの検知ロジック ---
    try {
      const data = await client.api.live.getSubscribed({ page_size: 50, page: 1 });
      const liveList = data.results || [];
      const subLive = liveList.find((l: any) => l.author.id.toString() === CONFIG.DJ_ID);
      if (subLive) liveId = Number(subLive.id);
    } catch {}

    if (liveId <= 0) {
      try {
        const current: any = await client.api.user.getCurrentLive(djId);
        liveId = Number(current?.current_live_id || current?.currentLiveId || 0);
      } catch {}
    }

    // 検知の確定と通知
    if (liveId > 0 && pendingLiveId !== liveId) {
      pendingLiveId = liveId;
      console.log(`🎬 live detected: ${liveId}`);

      // ✅ 第2引数として liveId を渡すことで、bot.ts 側でボタンが作られるようになります
      notifyHandler(`🎬 **配信を検知しました**\n🆔 LiveId: ${liveId}`, liveId);
    } else if (liveId <= 0) {
      pendingLiveId = null;
    }
  } catch (e: any) {
    const status = e?.status_code || e?.error?.status_code;
    if (status === 460) {
      tokenRefreshBackoffUntil = Date.now() + TOKEN_REFRESH_BACKOFF_MS;
      return;
    }
    console.warn("⚠️ detectLoop error:", e.message);
  }
}

export async function main() {
  try {
    const client = await initSpoon();
    notifyHandler(`🚀 **kametti 監視システム起動**\n対象: ${CONFIG.DJ_ID}`);
    setInterval(() => detectLoop(client), CONFIG.CHECK_INTERVAL_MS);
    await detectLoop(client);
  } catch (e: any) {
    console.error("❌ 起動失敗:", e.message);
  }
}

if (process.argv[1].endsWith("app.ts")) {
  main();
}
