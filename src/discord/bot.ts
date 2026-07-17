import "dotenv/config";
import { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, Events, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageReaction, EmbedBuilder, MessageFlags } from "discord.js";
import { spoonClient, pendingLiveId, setNotifyHandler, main as startApp } from "../app";
import { EventName, ROOM_CLOSE_EVENT_NAME } from "../spoon/events";
import kuromoji from "kuromoji";

// --- 設定の読み込み ---
const TARGET_USER_IDS = (process.env.TARGET_IDS || "").split(",").map((id) => id.trim());
const CHAT_CHANNEL_ID = process.env.DISCORD_CHAT_CHANNEL_ID;
const MAIN_CHANNEL_ID = process.env.DISCORD_MAIN_CHANNEL_ID;
const DAJARE_CHANNEL_ID = process.env.DISCORD_DAJARE_CHANNEL_ID;

type HeartUserStat = {
  userId: string;
  nickname: string;
  count: number;
};

type HeartTracker = {
  liveId: number;
  baselineTotal: number;
  total: number;
  users: Map<string, HeartUserStat>;
  finalReported: boolean;
};

let heartTracker: HeartTracker | null = null;

// --- ダジャレ判定・形態素解析の準備 (Shareka) ---
let tokenizer: kuromoji.Tokenizer<kuromoji.IpadicFeatures> | null = null;
kuromoji.builder({ dicPath: "node_modules/kuromoji/dict" }).build((err, _tokenizer) => {
  if (err) return console.error("❌ Kuromoji初期化エラー:", err);
  tokenizer = _tokenizer;
  console.log("✅ Kuromoji (形態素解析) 準備完了");
});

class Shareka {
  private replace_words = [
    ["。", ""],
    ["、", ""],
    [",", ""],
    [".", ""],
    ["!", ""],
    ["！", ""],
    ["・", ""],
    ["「", ""],
    ["」", ""],
    ["「", ""],
    ["｣", ""],
    ["『", ""],
    ["』", ""],
    [" ", ""],
    ["　", ""],
    ["ッ", ""],
    ["ャ", "ヤ"],
    ["ュ", "ユ"],
    ["ョ", "ヨ"],
    ["ァ", "ア"],
    ["ィ", "イ"],
    ["ゥ", "ウ"],
    ["ェ", "エ"],
    ["ォ", "オ"],
    ["ッ", ""],
    ["ー", ""],
  ];
  private kaburi: number;
  private sentence: string;
  private preprocessed: string;
  private devided: string[];

  constructor(sentence: string, n = 3) {
    this.kaburi = n;
    this.sentence = sentence;

    // 読みの取得 (MeCab -Oyomi の代わり)
    const kana = tokenizer
      ? tokenizer
          .tokenize(sentence)
          .map((t) => t.reading || t.surface_form)
          .join("")
      : sentence;

    this.preprocessed = this.preprocessing(kana);
    this.devided = this.devide(this.preprocessed);
  }

  private preprocessing(sentence: string): string {
    let result = sentence;
    for (const [target, replacement] of this.replace_words) {
      result = result.split(target).join(replacement);
    }
    return result;
  }

  private devide(sentence: string): string[] {
    const elements: string[] = [];
    const repeat_num = sentence.length - (this.kaburi - 1);
    for (let i = 0; i < repeat_num; i++) {
      elements.push(sentence.substring(i, i + this.kaburi)); // elements.push
    }
    // JSのArrayにappendはないので push に読み替えます
    return elements;
  }

  // 重複の最大数とその単語を取得
  private list_max_dup(): [string, number] {
    const counts: { [key: string]: number } = {};
    let maxWord = "";
    let maxCount = 0;

    for (const word of this.devided) {
      counts[word] = (counts[word] || 0) + 1;
      if (counts[word] > maxCount) {
        maxCount = counts[word];
        maxWord = word;
      }
    }
    return [maxWord, maxCount];
  }

  // 重複率の計算: (n-gramの長さ * 出現回数) / プリプロセス後の全文字数
  private sentence_max_dup_rate(maxWord: string): number {
    if (this.preprocessed.length === 0) return 1;
    const [, count] = this.list_max_dup();
    return (maxWord.length * count) / this.preprocessed.length;
  }

  public dajarewake(): boolean {
    if (this.devided.length === 0) return false;

    const [maxWord, maxCount] = this.list_max_dup();
    const rate = this.sentence_max_dup_rate(maxWord);

    // ルール: 重複が2回以上、かつ重複部分が全体の50%以下
    if (maxCount > 1 && rate <= 0.5) {
      return true;
    }
    return false;
  }
}

// --- Discord Client の初期化 ---
// ✅ 重要: GuildMessages と MessageContent を追加して発言を読み取れるようにする
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMessageReactions],
});

const sendDiscordMessage = async (content: string | EmbedBuilder, channelId = MAIN_CHANNEL_ID, liveId?: number | string) => {
  if (!channelId) return null;
  try {
    const channel = await client.channels.fetch(channelId as string);
    if (channel?.isTextBased()) {
      const payload: any = {};

      if (typeof content === "string") {
        // 文字列の場合は content にセット
        payload.content = content;
      } else {
        // Embed オブジェクトの場合は embeds 配列にセット
        payload.embeds = [content];
      }

      // liveId がある場合はボタン（Component）を作成
      if (liveId) {
        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(new ButtonBuilder().setCustomId(`join_live_${liveId}`).setLabel("配信に参加").setStyle(ButtonStyle.Primary).setEmoji("🎧"));
        payload.components = [row];
      }

      return await (channel as any).send(payload);
    }
  } catch (e) {
    console.error("❌ Discord送信失敗:", e);
  }
  return null;
};

const extractLiveIdFromUrl = (raw: string): number | null => {
  const text = raw.trim();
  if (!text) return null;

  // 入力が数値のみならそのままLiveIDとして扱う
  if (/^\d+$/.test(text)) {
    const asNumber = Number(text);
    return Number.isSafeInteger(asNumber) && asNumber > 0 ? asNumber : null;
  }

  // URLから末尾の数値パスや liveId クエリを抽出
  const liveIdQuery = text.match(/[?&]live(?:_|)id=(\d+)/i);
  if (liveIdQuery?.[1]) {
    const id = Number(liveIdQuery[1]);
    return Number.isSafeInteger(id) && id > 0 ? id : null;
  }

  const trailingPathId = text.match(/\/(\d+)(?:[/?#]|$)/);
  if (trailingPathId?.[1]) {
    const id = Number(trailingPathId[1]);
    return Number.isSafeInteger(id) && id > 0 ? id : null;
  }

  return null;
};

setNotifyHandler((message, liveId) => {
  void sendDiscordMessage(message, MAIN_CHANNEL_ID, liveId);
});

const upsertHeartUser = (userId: string, nickname: string, delta: number) => {
  if (!heartTracker) return;

  const current = heartTracker.users.get(userId) || { userId, nickname, count: 0 };
  current.nickname = nickname || current.nickname || "不明";
  current.count += delta;
  heartTracker.users.set(userId, current);
  heartTracker.total += delta;
};

const getHeartSummaryText = (limit = 10): string => {
  if (!heartTracker) return "❤️ まだハート集計は開始されていません。";

  const top = Array.from(heartTracker.users.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, Math.max(1, limit));

  const lines = top.map((u, i) => `${i + 1}. ${u.nickname} (${u.userId}): ${u.count}`);
  const delta = Math.max(0, heartTracker.total - heartTracker.baselineTotal);

  return [`❤️ **ハート集計**`, `🆔 LiveID: ${heartTracker.liveId}`, `📌 参加時点の総ハート: ${heartTracker.baselineTotal}`, `➕ 参加後に増えたハート: ${delta}`, `📈 現在の推定総ハート: ${heartTracker.total}`, "", top.length ? "**ユーザー別 上位**" : "ユーザー別データがありません。", ...lines].join("\n");
};

const sendFinalHeartSummary = async (reason: "room-close" | "manual-leave") => {
  if (!heartTracker) return;
  if (heartTracker.finalReported) return;

  const header = reason === "room-close" ? "🏁 配信終了を検知しました。最終ハート集計です。" : "👋 退出時点のハート集計です。";
  await sendDiscordMessage(`${header}\n\n${getHeartSummaryText()}`, MAIN_CHANNEL_ID);
  heartTracker.finalReported = true;
};

const resolveEventName = (eventNameOrEvent: any): string => {
  if (typeof eventNameOrEvent === "string") return eventNameOrEvent;
  return String(eventNameOrEvent?.eName || eventNameOrEvent?.eventName || "");
};

const initializeHeartTracker = async (liveId: number) => {
  if (!spoonClient) return;

  const users = new Map<string, HeartUserStat>();
  let seededTotal = 0;
  let next: string | undefined;

  try {
    do {
      const likeRes: any = await spoonClient.api.live.getLikeRank(liveId, next);
      const list = likeRes?.results || [];

      for (const user of list) {
        const userId = String(user?.id ?? "").trim();
        if (!userId) continue;

        const count = Number(user?.like_count ?? 0);
        const safeCount = Number.isFinite(count) && count > 0 ? count : 0;
        users.set(userId, {
          userId,
          nickname: user?.nickname || "不明",
          count: safeCount,
        });
        seededTotal += safeCount;
      }

      next = likeRes?.next || undefined;
    } while (next);
  } catch (e: any) {
    console.warn("⚠️ 初期ハート取得に失敗:", e?.message || e);
  }

  const currentLive: any = (spoonClient.live as any)?.currentLive;
  const baselineFromLive = Number(currentLive?.like_count || currentLive?.likeCount || 0);
  const baselineTotal = Number.isFinite(baselineFromLive) && baselineFromLive > 0 ? baselineFromLive : 0;

  heartTracker = {
    liveId,
    baselineTotal,
    total: Math.max(baselineTotal, seededTotal),
    users,
    finalReported: false,
  };

  await sendDiscordMessage([`❤️ ハート集計を開始しました（LiveID: ${liveId}）`, `参加時点の総ハート: ${heartTracker.baselineTotal}`, `参加時点で取得できたユーザー数: ${heartTracker.users.size}`].join("\n"), MAIN_CHANNEL_ID);
};

// --- スラッシュコマンド登録 ---
async function registerCommands() {
  const appId = process.env.DISCORD_APP_ID!;
  const guildId = process.env.DISCORD_GUILD_ID!;
  const commands = [
    new SlashCommandBuilder()
      .setName("join")
      .setDescription("検知中のライブに参加")
      .addStringOption((option) => option.setName("url").setDescription("配信URLまたはLiveIDを指定して参加（任意）").setRequired(false)),
    new SlashCommandBuilder().setName("leave").setDescription("退室"),
    new SlashCommandBuilder().setName("hearts").setDescription("現在のハート集計（ユーザー別）を表示"),
  ].map((c) => c.toJSON());

  const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_BOT_TOKEN!);
  await rest.put(Routes.applicationGuildCommands(appId, guildId), { body: commands });
}

client.once(Events.ClientReady, async () => {
  console.log(`🤖 Bot Ready: ${client.user?.tag}`);
  await registerCommands();
  await startApp();
});

// ✅ 共通の「退室ボタン」コンポーネントを作成する関数
const createLeaveButtonRow = () => {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(new ButtonBuilder().setCustomId("leave_live_btn").setLabel("配信から退室する").setStyle(ButtonStyle.Danger).setEmoji("👋"));
};

// --- 関数の外側に配置する保管庫 ---
let tempUserBuffer: string[] = [];
let liveFlushTimer: NodeJS.Timeout | null = null;
const BUFFER_DELAY_MS = 200; // 2秒間、他の同時受信を待つ

// 溜まったユーザー名をまとめて配信内に送信する関数
async function flushLiveUserBuffer() {
  if (tempUserBuffer.length === 0) return;

  // 重複したユーザー名を排除（同じ人が複数クライアントで同時に検知された場合のため）
  const uniqueUsers = Array.from(new Set(tempUserBuffer));
  tempUserBuffer = [];
  liveFlushTimer = null;

  if (spoonClient && spoonClient.live) {
    try {
      // 例: 「ユーザーAさん、ユーザーBさん が入室しました！」
      const joinedNames = uniqueUsers.join("さん、");
      const combinedMessage = `${joinedNames}さん\nの温度が上昇しました！`;

      await spoonClient.live.message(combinedMessage);
      console.log(`💬 配信内にまとめメッセージを送信しました: ${combinedMessage}`);
    } catch (e: any) {
      console.error("❌ 配信内へのまとめチャット送信失敗:", e);
    }
  }
}

// --- ライブリスナーの共通化 (二重登録防止用) ---
function setupLiveListeners(live: any) {
  live.removeAllListeners("event:all");
  live.on("event:all", async (eventNameOrEvent: any, payload: any) => {
    const eName = resolveEventName(eventNameOrEvent);

    if (eName === ROOM_CLOSE_EVENT_NAME) {
      await sendFinalHeartSummary("room-close");
      heartTracker = null;
      return;
    }

    if (eName === EventName.LIVE_FREE_LIKE || eName === EventName.LIVE_PAID_LIKE) {
      const userId = String(payload?.userId ?? payload?.generator?.id ?? "").trim();
      const nickname = payload?.nickname || payload?.generator?.nickname || "不明";
      const rawDelta = eName === EventName.LIVE_FREE_LIKE ? payload?.count : payload?.amount;
      const delta = Number(rawDelta ?? 1);
      const safeDelta = Number.isFinite(delta) && delta > 0 ? delta : 1;

      if (heartTracker && userId) {
        upsertHeartUser(userId, nickname, safeDelta);
      }

      if (spoonClient && spoonClient.live) {
        const heartMessage = `𓂃 ❥ 𓊝𓂃𓂃𓂃𓂃𓂃𓂃
　　　　　　 𓈒𓏸
　　　ｼ ｭ ﾜ ー ｯ ﾁ !!
　　　　　 .゜`;
        await spoonClient.live.message(heartMessage);
        console.error("ハートコメントを送信しました。");
      }
    }

    if (eName === EventName.CHAT_MESSAGE) {
      const gen = payload.generator || payload.author || payload.user || payload;
      const userId = gen?.id?.toString();
      const nickname = gen?.nickname || "不明";
      const message = payload.message || "";
      // 自分の発言（ループ防止）
      const myId = (spoonClient as any).logonUser?.id?.toString();
      if (userId === myId) return;

      // A. 指定チャンネルに全コメント転送
      await sendDiscordMessage(`💬 **${nickname}** :\n ${message}`, CHAT_CHANNEL_ID);

      // B. 特定ユーザー（または全員）のダジャレ判定
      if (TARGET_USER_IDS.includes(userId)) {
        const checker = new Shareka(message, 2);
        if (checker.dajarewake()) {
          const profileIcon = gen?.profile_url || gen?.profileUrl || "";
          const dajareEmbed = new EmbedBuilder()
            .setColor(0x00ae86) // エメラルドグリーン
            .setAuthor({ name: `${nickname}のダジャレ候補` })
            .setTitle(message)
            .setThumbnail(profileIcon)
            .addFields({ name: "📊 状況", value: "投票受付中", inline: true })
            .setTimestamp();

          const dajareMsg = await sendDiscordMessage(dajareEmbed, DAJARE_CHANNEL_ID);

          if (dajareMsg) {
            await dajareMsg.react("⭕");
            await dajareMsg.react("❌");

            const filter = (reaction: any, user: any) => {
              return ["⭕", "❌"].includes(reaction.emoji.name) && !user.bot;
            };

            // 投票監視を開始（24時間）
            const collector = dajareMsg.createReactionCollector({ filter, time: 24 * 60 * 60 * 1000 });

            collector.on("collect", async (reaction: MessageReaction) => {
              const count: number = reaction.count - 1; // Bot自身の分を除く
              const threshold: number = Number(process.env.VOTE_THRESHOLD); // 判定基準（票数）

              if (reaction.emoji.name === "⭕" && count >= threshold) {
                const approvedEmbed = new EmbedBuilder()
                  .setColor(0xffd700) // ゴールド
                  .setAuthor({ name: "🏆 公認ダジャレ！" })
                  .setTitle(message)
                  .addFields({ name: "投稿者", value: `${nickname}`, inline: true })
                  .setThumbnail(profileIcon)
                  .setFooter({ text: "kametti Dajare System" })
                  .setTimestamp();

                await dajareMsg.edit({ embeds: [approvedEmbed] });
                collector.stop();
              }

              if (reaction.emoji.name === "❌" && count >= threshold) {
                try {
                  // ✅ メッセージを削除する
                  console.log(`🗑️ ダジャレ却下のためメッセージを削除します: [${nickname}]: ${message}`);
                  await dajareMsg.delete();
                } catch (e: unknown) {
                  console.error("❌ メッセージ削除失敗:", e);
                }
                collector.stop();
              }
            });
          }
        }
      }
    }

    //マネージャーは不可
    if (eName === EventName.LIVE_TEMP) {
      console.error("");
      const gen = payload.generator || payload.author || payload.user || payload;
      const userId = gen?.id?.toString();
      const nickname = gen?.nickname || "???";

      const myId = (spoonClient as any).logonUser?.id?.toString();
      if (userId === myId) return;

      tempUserBuffer.push(nickname);

      // すでにタイマーが動いていたらクリア（最後の受信から2秒後に送信するため）
      if (liveFlushTimer) {
        clearTimeout(liveFlushTimer);
      }

      // タイマーを新しくセット（デバウンス処理）
      liveFlushTimer = setTimeout(() => {
        flushLiveUserBuffer().catch((err) => console.error("Live buffer flush error:", err));
      }, BUFFER_DELAY_MS);
    }
  });
}

// ✅ インタラクション処理の修正
client.on(Events.InteractionCreate, async (interaction) => {
  try {
    // 1. スラッシュコマンドの処理
    if (interaction.isChatInputCommand()) {
      if (interaction.commandName === "join") {
        if (!spoonClient) return interaction.reply({ content: "❌ ボットの準備ができていません。", flags: [MessageFlags.Ephemeral] });

        const inputUrl = interaction.options.getString("url");
        const requestedLiveId = inputUrl ? extractLiveIdFromUrl(inputUrl) : null;
        const targetLiveId = requestedLiveId ?? pendingLiveId;

        if (!targetLiveId) {
          return interaction.reply({
            content: inputUrl ? "❌ URLからLiveIDを抽出できませんでした。例: `/join url:https://.../live/123456`" : "❌ 配信がありません。`/join url:<配信URL>` で直接指定できます。",
            flags: [MessageFlags.Ephemeral],
          });
        }

        await interaction.deferReply();
        setupLiveListeners(spoonClient.live);
        await spoonClient.live.join(targetLiveId);
        await initializeHeartTracker(targetLiveId);

        // ✅ 修正：退室ボタンを添えて返信する
        await interaction.editReply({
          content: `✅ LiveID: ${targetLiveId} に参加しました！`,
          components: [createLeaveButtonRow()],
        });
      }

      if (interaction.commandName === "leave") {
        if (spoonClient) {
          await sendFinalHeartSummary("manual-leave");
          await spoonClient.live.close();
          heartTracker = null;
          await interaction.reply({ content: "👋 退室しました", components: [] }); // ボタンを消去
        }
      }

      if (interaction.commandName === "hearts") {
        return interaction.reply({
          content: getHeartSummaryText(),
          flags: [MessageFlags.Ephemeral],
        });
      }
      return;
    }

    // 2. ボタンクリックの処理
    if (interaction.isButton()) {
      // --- 配信に参加ボタン ---
      if (interaction.customId.startsWith("join_live_")) {
        const liveId = parseInt(interaction.customId.split("_")[2]);
        if (!spoonClient) return interaction.reply({ content: "❌ ボットの準備ができていません。", flags: [MessageFlags.Ephemeral] });

        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

        try {
          setupLiveListeners(spoonClient.live);
          await spoonClient.live.join(liveId);
          await initializeHeartTracker(liveId);
          // ✅ 修正：退室ボタンを添えて返信する
          await interaction.editReply({
            content: `✅ LiveID: ${liveId} に参加しました！`,
            components: [createLeaveButtonRow()],
          });
        } catch (e: any) {
          await interaction.editReply(`❌ 参加に失敗しました: ${e.message}`);
        }
      }

      // --- 配信から退室ボタン ---
      if (interaction.customId === "leave_live_btn") {
        if (!spoonClient || !spoonClient.live) {
          return interaction.reply({ content: "⚠️ すでに退室しているか、準備ができていません。", flags: [MessageFlags.Ephemeral] });
        }

        // ✅ deferReply ではなく deferUpdate を使う
        // これにより「元のメッセージ（ボタンがあるメッセージ）を更新する」という宣言になります
        await interaction.deferUpdate();

        try {
          // Spoonの退室処理を実行
          await sendFinalHeartSummary("manual-leave");
          await spoonClient.live.close();
          heartTracker = null;

          // ✅ editReply で元のメッセージを書き換える
          // content を上書きし、components を空にすることでボタンを消去します
          await interaction.editReply({
            content: "👋 正常に退室しました。",
            components: [],
          });

          // console.log("✅ 退室完了とボタンの消去に成功しました");
        } catch (e: any) {
          console.error("❌ 退室処理中のエラー:", e);
          // すでに deferUpdate しているので、エラーも editReply で送る
          await interaction.followUp({
            content: `⚠️ 退室処理中にエラーが発生しました: ${e.message}`,
            flags: [MessageFlags.Ephemeral],
          });
        }
      }
    }
  } catch (err: any) {
    console.error("⚠️ インタラクションエラー:", err);
  }
});

// --- 双方向チャット: Discord -> Spoon ---
client.on(Events.MessageCreate, async (message) => {
  // Bot自身の発言、またはチャット用チャンネル以外は無視
  if (message.author.bot || message.channelId !== CHAT_CHANNEL_ID) return;

  if (spoonClient && spoonClient.live) {
    try {
      await spoonClient.live.message(message.content);
      await message.react("✅");
    } catch (e: any) {
      console.error("❌ Spoonへのチャット送信失敗:", e);
      await message.react("❌");
    }
  } else {
    // 参加していない場合、リアクションで通知
    await message.react("⚠️");
  }
});

client.login(process.env.DISCORD_BOT_TOKEN);
