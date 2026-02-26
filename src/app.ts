import "dotenv/config";

// HTTP DEBUGログの制御（リポジトリの仕様）
if (process.env.SOPIA_HTTP_DEBUG !== "1") {
  console.debug = () => {};
}

import { SpoonV2, Country, LogLevel } from "@sopia-bot/core";

// --- Discord通知用インターフェース ---
export type NotifyHandler = (message: string) => void;
let notifyHandler: NotifyHandler = (msg) => console.log(`[Log] ${msg}`);
export const setNotifyHandler = (handler: NotifyHandler) => {
  notifyHandler = handler;
};

// --- 状態管理・バックオフ変数 (リポジトリ仕様) ---
export let pendingLiveId: number | null = null;
export let spoonClient: SpoonV2 | null = null;

const TOKEN_REFRESH_BACKOFF_MS = Number(process.env.TOKEN_REFRESH_BACKOFF_MS || "300000"); // 5分
let tokenRefreshBackoffUntil = 0;
const SPOON_HTTP_ANOMALY_BACKOFF_MS = Number(process.env.SPOON_HTTP_ANOMALY_BACKOFF_MS || "600000"); // 10分

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

/**
 * リポジトリの仕様を完全再現した検知ループ
 */
async function detectLoop(client: SpoonV2) {
  // バックオフ中（エラー直後など）はリクエストを送らない
  if (tokenRefreshBackoffUntil && Date.now() < tokenRefreshBackoffUntil) return;

  try {
    const djId = Number(CONFIG.DJ_ID);
    let liveId = 0;
    const now = Date.now();
    const state = detectLoop as any;

    // 診断用の一時変数
    let currentLiveIsLive: boolean | null = null;
    let currentLiveId: number | null = null;
    let userInfoLiveId: number | null = null;
    let checkLiveId: number | null = null;

    // --- ルート1: 購読リストからの検知 (MONITORモードの基本仕様) ---
    try {
      const data = await client.api.live.getSubscribed({ page_size: 50, page: 1 });
      const liveList = data.results || [];
      const subLive = liveList.find((l: any) => l.author.id.toString() === CONFIG.DJ_ID);
      if (subLive) liveId = Number(subLive.id);
    } catch {}

    // --- ルート2: 指定IDの直接確認 (DJ自己検知ルートの堅牢ロジックを流用) ---
    if (liveId <= 0) {
      try {
        const current: any = await client.api.user.getCurrentLive(djId);
        currentLiveIsLive = current?.is_live;
        currentLiveId = current?.current_live_id || current?.currentLiveId;
        liveId = Number(currentLiveId || 0);
      } catch {}
    }

    // --- ルート3: ユーザー情報の詳細確認 (15秒間隔のフォールバック) ---
    state._lastUserInfoAt ??= 0;
    if (liveId <= 0 && now - state._lastUserInfoAt >= 15000) {
      state._lastUserInfoAt = now;
      try {
        const me: any = await client.api.user.getUserInfo(djId);
        const meUser: any = Array.isArray(me?.results) ? me.results[0] : me?.results;
        userInfoLiveId = meUser?.current_live_id || meUser?.current_live?.id || meUser?.currentLiveId;
        liveId = Number(userInfoLiveId || 0);
      } catch {}
    }

    // --- ルート4: 配信チェックAPI (5秒間隔のフォールバック) ---
    state._lastLiveCheckAt ??= 0;
    if (liveId <= 0 && now - state._lastLiveCheckAt >= 5000) {
      state._lastLiveCheckAt = now;
      try {
        const checkRes: any = await client.api.live.check(djId);
        const r0 = checkRes?.results?.[0];
        checkLiveId = r0?.live_id || r0?.liveId || r0?.live?.id;
        if (checkLiveId) liveId = Number(checkLiveId);
      } catch {}
    }

    // 診断ログの出力 (DIAG_DETECT=1)
    if (CONFIG.DIAG_DETECT) {
      state._lastDiagAt ??= 0;
      state._lastDiagKey ??= "";
      const key = `sub:${liveId > 0};dj:is_live=${currentLiveIsLive};dj:id=${currentLiveId};user_info=${userInfoLiveId};check=${checkLiveId}`;
      if (key !== state._lastDiagKey || now - state._lastDiagAt >= 30000) {
        state._lastDiagAt = now;
        state._lastDiagKey = key;
        console.log(`🔎 DJ detect: ${key}`);
      }
    }

    // 検知の確定と通知
    if (liveId > 0 && pendingLiveId !== liveId) {
      pendingLiveId = liveId;
      console.log(`🎬 live detected: ${liveId}`);
      notifyHandler(`🎬 **配信を検知しました**\n🆔 LiveId: ${liveId}\n\n参加するには Discord で \`/join\` を実行してください。`);
    } else if (liveId <= 0) {
      pendingLiveId = null;
    }
  } catch (e: any) {
    const status = e?.status_code || e?.error?.status_code;
    const message = String(e?.message || "");

    // 1. トークン失効 (460)
    if (status === 460) {
      tokenRefreshBackoffUntil = Date.now() + TOKEN_REFRESH_BACKOFF_MS;
      console.log(`🔄 トークン失効。${TOKEN_REFRESH_BACKOFF_MS / 1000}秒待機します。`);
      return;
    }

    // 2. ネットワークエラー (fetch failed / timeout) への対応を追加
    if (message.includes("fetch failed") || e.code === "UND_ERR_CONNECT_TIMEOUT") {
      tokenRefreshBackoffUntil = Date.now() + SPOON_HTTP_ANOMALY_BACKOFF_MS;
      console.log(`🌐 ネットワーク接続エラー。一時的に${SPOON_HTTP_ANOMALY_BACKOFF_MS / 1000}秒待機します。`);
      return;
    }

    // 3. HTMLが返る等の異常応答
    if (message.includes("Unexpected token") || message.toLowerCase().includes("<html")) {
      tokenRefreshBackoffUntil = Date.now() + SPOON_HTTP_ANOMALY_BACKOFF_MS;
      console.log(`⚠️ Spoon API異常。${SPOON_HTTP_ANOMALY_BACKOFF_MS / 1000}秒待機します。`);
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
