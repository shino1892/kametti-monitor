import "dotenv/config";
import { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, Events, ChatInputCommandInteraction } from "discord.js";
import { spoonClient, pendingLiveId, setNotifyHandler, main as startApp } from "../app";
import { EventName } from "../spoon/events";
import kuromoji from "kuromoji";

// --- 設定の読み込み ---
const TARGET_USER_IDS = (process.env.TARGET_IDS || "").split(",").map((id) => id.trim());
const CHAT_CHANNEL_ID = process.env.DISCORD_CHAT_CHANNEL_ID;
const MAIN_CHANNEL_ID = process.env.DISCORD_MAIN_CHANNEL_ID;

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
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});

const sendDiscordMessage = async (content: string, channelId = MAIN_CHANNEL_ID) => {
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

setNotifyHandler(sendDiscordMessage);

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

// --- インタラクション (コマンド) 処理 ---
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "join") {
    if (!pendingLiveId || !spoonClient) {
      return interaction.reply({ content: "❌ 配信が検知されていないか、準備中です。", ephemeral: true });
    }
    await interaction.deferReply();

    try {
      const live = spoonClient.live;
      live.removeAllListeners("event:all");

      live.on("event:all", async (eventName, payload) => {
        if (eventName === EventName.CHAT_MESSAGE) {
          const gen = (payload as any).generator || (payload as any).author || (payload as any).user || payload;
          const userId = gen?.id?.toString();
          const nickname = gen?.nickname || "不明なユーザー";
          const message = (payload as any).message || "";

          // 自分の発言（ループ防止）
          const myId = (spoonClient as any).logonUser?.id?.toString();
          if (userId === myId) return;

          // A. 指定チャンネルに全コメント転送
          await sendDiscordMessage(`💬 **${nickname}**: ${message}`, CHAT_CHANNEL_ID);

          // B. 特定ユーザー（または全員）のダジャレ判定
          if (TARGET_USER_IDS.includes(userId)) {
            const checker = new Shareka(message, 2);
            if (checker.dajarewake()) {
              await sendDiscordMessage(`🤣 **ダジャレ検知！**\n👤 **${nickname}**: ${message}`, MAIN_CHANNEL_ID);
            }
          }
        }
      });

      await live.join(pendingLiveId);
      await interaction.editReply(`✅ LiveID: ${pendingLiveId} に参加しました！`);
    } catch (e: any) {
      await interaction.editReply(`❌ 参加エラー: ${e.message}`);
    }
  }

  if (interaction.commandName === "leave") {
    if (spoonClient) {
      await spoonClient.live.close();
      await interaction.reply("👋 退室しました");
    }
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
