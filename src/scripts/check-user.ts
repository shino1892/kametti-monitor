import "dotenv/config";
import { SpoonV2, Country } from "@sopia-bot/core";

async function checkUserById(id: string | number) {
  const client = new SpoonV2(Country.JAPAN);
  await client.init();
  
  const userId = Number(id);
  
  try {
    // ユーザーIDから情報を取得
    const result: any = await client.api.user.getUserInfo(userId);

    console.log(result)

    if (result) {
      console.log(`------------------------------------`);
      console.log(`✅ 名前（ニックネーム）: ${result.nickname}`);
      console.log(`✅ ユーザータグ: @${result.tag}`);
      console.log(`✅ 内部ユーザーID: ${result.id}`);
      console.log(`✅ プロフィール画像: ${result.profile_url}`);
      console.log(`✅ 自己紹介文:\n${result.self_introduction || "（未設定）"}`);
      console.log(`✅ フォロワー数: ${result.follower_count}`);
      console.log(`✅ フォロー数: ${result.following_count}`);
      console.log(`------------------------------------`);
    } else {
      console.log(`❌ ユーザーID「${userId}」の情報は見つかりませんでした。`);
    }
  } catch (e: any) {
    console.error("❌ エラーが発生しました:", e.message);
  }
}

// 実行時の引数からIDを取得
const targetId = process.argv[2];

if (!targetId) {
  console.log("使用法: pnpm tsx src/scripts/check-user.ts [ユーザーID]");
} else {
  checkUserById(targetId);
}