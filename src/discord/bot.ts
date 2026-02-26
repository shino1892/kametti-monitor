import "dotenv/config";
import { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, ChatInputCommandInteraction, Events, TextChannel } from "discord.js";
import { spoonClient, pendingLiveId, setNotifyHandler, main as startApp } from "../app";
import { EventName } from "../spoon/events";
import kuromoji from "kuromoji";

const TARGET_USER_IDS = (process.env.TARGET_IDS || "").split(",").map((id) => id.trim());

// --- ダジャレ判定・形態素解析の準備 ---
let tokenizer: kuromoji.Tokenizer<kuromoji.IpadicFeatures> | null = null;

// Kuromojiの初期化（辞書の読み込み）
kuromoji.builder({ dicPath: "node_modules/kuromoji/dict" }).build((err, _tokenizer) => {
  if (err) {
    console.error("❌ Kuromoji初期化エラー:", err);
    return;
  }
  tokenizer = _tokenizer;
  console.log("✅ Kuromoji (形態素解析) の準備が完了しました。");
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

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// Discordへの送信関数を定義
const sendDiscordMessage = async (content: string) => {
  const channelId = process.env.DISCORD_CHANNEL_ID;
  if (!channelId) return;
  try {
    const channel = await client.channels.fetch(channelId);
    if (channel?.isTextBased()) {
      await (channel as any).send(content);
    }
  } catch (e) {
    console.error("❌ Discord送信失敗:", e);
  }
};

// app.ts に通知関数を登録
setNotifyHandler(sendDiscordMessage);

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
  // Botの準備ができたら app.ts のメインロジックを開始
  await startApp();
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  // src/discord/bot.ts の該当箇所を差し替え
  if (interaction.commandName === "join") {
    if (!pendingLiveId || !spoonClient) {
      return interaction.reply({ content: "❌ 現在検知されている配信がないか、Spoonクライアントが準備できていません。", ephemeral: true });
    }

    await interaction.deferReply();

    try {
      const live = spoonClient.live;

      // 二重登録を避けるため既存のリスナーを解除
      live.removeAllListeners("event:all");

      // コメント受信のログ出力をリポジトリの collector.ts 仕様に合わせる
      live.on("event:all", async (eventName, payload) => {
        if (eventName === EventName.CHAT_MESSAGE) {
          // payload から nickname を安全に取得するロジック
          const gen = payload.generator || payload.author || payload.user || payload;
          const userId = gen?.id?.toString();
          const nickname = gen?.nickname || "不明なユーザー";
          const message = payload.message || "";

          // 1. 特定のユーザーかチェック
          if (true || TARGET_USER_IDS.includes(userId)) {
            // 2. ダジャレかどうかを判定（ここでは例として全て転送するか、判定を挟む）
            const checker = new Shareka(message, 2);
            if (checker.dajarewake()) {
              console.log(`✨ ダジャレ検知: [${nickname}]: ${message}`);

              // 3. Discordに送信
              const channelId = process.env.DISCORD_CHANNEL_ID;
              const channel = await client.channels.fetch(channelId!);
              if (channel?.isTextBased()) {
                await (channel as any).send(`🤣 **ダジャレ検知！**\n👤 **${nickname}**: ${message}`);
              }
            }
          }

          console.log(`💬 [Chat] ${nickname}: ${message}`);
        }
      });

      console.log(`⏳ LiveID: ${pendingLiveId} に参加を試みています...`);

      // ライブに参加
      await live.join(pendingLiveId);

      await interaction.editReply(`✅ LiveID: ${pendingLiveId} に参加しました！コンソールにコメントが表示されます。`);
    } catch (e: any) {
      console.error("❌ /join 実行エラー:", e);

      // Discord側にもエラー詳細を表示
      const errorMsg = e.message || "不明なエラー";
      await interaction.editReply(`❌ 参加に失敗しました: \`${errorMsg}\` (LiveID: ${pendingLiveId})`);
    }
  }

  if (interaction.commandName === "leave") {
    if (spoonClient) {
      await spoonClient.live.close();
      await interaction.reply("👋 退室しました");
    }
  }
});

client.login(process.env.DISCORD_BOT_TOKEN);
