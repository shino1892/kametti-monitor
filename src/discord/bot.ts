import "dotenv/config";
import { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, Events, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageReaction, EmbedBuilder, MessageFlags } from "discord.js";
import { spoonClient, pendingLiveId, setNotifyHandler, main as startApp } from "../app";
import { EventName } from "../spoon/events";
import kuromoji from "kuromoji";

// --- 設定の読み込み ---
const TARGET_USER_IDS = (process.env.TARGET_IDS || "").split(",").map((id) => id.trim());
const CHAT_CHANNEL_ID = process.env.DISCORD_CHAT_CHANNEL_ID;
const MAIN_CHANNEL_ID = process.env.DISCORD_MAIN_CHANNEL_ID;
const DAJARE_CHANNEL_ID = process.env.DISCORD_DAJARE_CHANNEL_ID;

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

setNotifyHandler((message, liveId) => {
  void sendDiscordMessage(message, MAIN_CHANNEL_ID, liveId);
});

// --- スラッシュコマンド登録 ---
async function registerCommands() {
  const appId = process.env.DISCORD_APP_ID!;
  const guildId = process.env.DISCORD_GUILD_ID!;
  const commands = [new SlashCommandBuilder().setName("join").setDescription("検知中のライブに参加"), new SlashCommandBuilder().setName("leave").setDescription("退室")].map((c) => c.toJSON());

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

// --- ライブリスナーの共通化 (二重登録防止用) ---
function setupLiveListeners(live: any) {
  live.removeAllListeners("event:all");
  live.on("event:all", async (eventName: string, payload: any) => {
    if (eventName === EventName.CHAT_MESSAGE) {
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
  });
}

// ✅ インタラクション処理の修正
client.on(Events.InteractionCreate, async (interaction) => {
  try {
    // 1. スラッシュコマンドの処理
    if (interaction.isChatInputCommand()) {
      if (interaction.commandName === "join") {
        if (!pendingLiveId || !spoonClient) return interaction.reply({ content: "❌ 配信がありません。", flags: [MessageFlags.Ephemeral] });
        await interaction.deferReply();
        setupLiveListeners(spoonClient.live);
        await spoonClient.live.join(pendingLiveId);

        // ✅ 修正：退室ボタンを添えて返信する
        await interaction.editReply({
          content: `✅ LiveID: ${pendingLiveId} に参加しました！`,
          components: [createLeaveButtonRow()],
        });
      }

      if (interaction.commandName === "leave") {
        if (spoonClient) {
          await spoonClient.live.close();
          await interaction.reply({ content: "👋 退室しました", components: [] }); // ボタンを消去
        }
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
          await spoonClient.live.close();

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
