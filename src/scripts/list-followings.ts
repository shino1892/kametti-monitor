import "dotenv/config";
import { SpoonV2, Country, LogLevel } from "@sopia-bot/core";

async function main() {
  const client = new SpoonV2(Country.JAPAN, { logLevel: LogLevel.WARN });
  await client.init();

  const accessToken = process.env.ACCESS_TOKEN;
  const refreshToken = process.env.REFRESH_TOKEN;

  if (!accessToken || !refreshToken) {
    console.error("❌ .env に ACCESS_TOKEN または REFRESH_TOKEN が設定されていません。");
    return;
  }

  try {
    // トークンを設定してログイン
    await client.setToken(accessToken, refreshToken); //
    const me: any = (client as any).logonUser;

    if (!me) {
      console.error("❌ ログインに失敗しました。トークンが正しいか確認してください。");
      return;
    }

    console.log(`👤 ログイン中: ${me.nickname} (${me.id})\n`);
    console.log("--- フォロー中のユーザー一覧 ---");

    // フォロー一覧を取得（API構造に基づき試行）
    // @ts-ignore
    const res: any = await client.api.user.getFollowings(me.id);
    const followings = res.results || [];

    if (followings.length === 0) {
      console.log("フォロー中のユーザーが見つかりませんでした。");
      console.log("※現在配信中のユーザーのみを表示するには getSubscribed を使用します。");
    } else {
      followings.forEach((user: any) => {
        console.log(`- 名前: ${user.nickname.padEnd(15)} | ID: ${user.id}`);
      });
    }

  } catch (e: any) {
    console.error("❌ 取得エラー:", e.message);
    
    // フォロー一覧が取得できない場合のフォールバック（現在配信中のフォロー中ユーザーを表示）
    console.log("\n💡 ヒント: 現在配信中のフォロー中ユーザーを表示します...");
    try {
      const data = await client.api.live.getSubscribed({ page_size: 50 }); //
      const liveList = data.results || [];
      liveList.forEach((l: any) => {
        console.log(`- [配信中] 名前: ${l.author.nickname.padEnd(15)} | ID: ${l.author.id}`);
      });
    } catch (e2: any) {
      console.error("配信中一覧の取得も失敗しました:", e2.message);
    }
  }
}

main();