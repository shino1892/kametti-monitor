# kametti

Spoon の特定DJ配信を監視し、配信検知を Discord に通知しつつ、Discord のスラッシュコマンドでライブ参加してコメントを取得します。
（コメントの一部は簡易的なダジャレ判定を挟んで Discord に転送します）

## 前提

- Node.js（推奨: LTS）
- pnpm
- `@sopia-bot/core` をローカル参照しています（`package.json` の `file:../spoon/packages/core`）
  - このリポジトリと同階層に `../spoon` が存在する構成を想定しています
  - その構成でない場合は、依存関係の参照先を調整してください

## セットアップ

```bash
pnpm install
```

プロジェクトルートに `.env` を作成して環境変数を設定してください（後述）。

## 環境変数

最低限必要なもの（監視＋Discord bot運用）:

```dotenv
# Spoon
ACCESS_TOKEN=...
REFRESH_TOKEN=...
DJ_ID=12345678

# Discord
DISCORD_BOT_TOKEN=...
DISCORD_APP_ID=...
DISCORD_GUILD_ID=...
DISCORD_CHANNEL_ID=...

# ダジャレ検知対象ユーザーID（任意）
SHIERU=...
```

任意（挙動調整・デバッグ）:

- `CHECK_INTERVAL` : 監視間隔(ms)。未設定時 `5000`
- `DIAG_DETECT` : `1` で検知ルートの診断ログを出力
- `SOPIA_HTTP_DEBUG` : `1` で HTTP の debug ログを有効化（未設定/`1`以外は抑制）
- `TOKEN_REFRESH_BACKOFF_MS` : トークン失効時(460)のバックオフ(ms)。未設定時 `300000`
- `SPOON_HTTP_ANOMALY_BACKOFF_MS` : HTML応答など異常時のバックオフ(ms)。未設定時 `600000`

## 使い方

### 1) Discord Bot として起動（推奨）

`src/discord/bot.ts` を起動します。Bot が起動するとギルド内に `/join` と `/leave` が登録され、配信検知の通知が `DISCORD_CHANNEL_ID` に送られます。

```bash
pnpm tsx src/discord/bot.ts
```

- `/join` : 直近に検知した LiveId に参加してコメント受信を開始
- `/leave` : 退室

### 2) 監視だけをローカルで起動（コンソール通知）

Discord を介さず、検知ログをコンソールに出します。

```bash
pnpm dev
```

## 開発用スクリプト

- 型チェック:

```bash
pnpm check
```

- ユーザー情報確認（トークン不要）:

```bash
pnpm tsx src/scripts/check-user.ts <ユーザーID>
```

- フォロー中一覧（トークン必要）:

```bash
pnpm tsx src/scripts/list-followings.ts
```

## よくある問題

- `pnpm install` で `@sopia-bot/core` が見つからない
  - `package.json` が `file:../spoon/packages/core` を参照しているため、想定のディレクトリ配置になっているか確認してください。
- `/join` が「配信がない / Spoonクライアントが準備できていない」
  - 配信検知（`DJ_ID`）とトークン（`ACCESS_TOKEN`/`REFRESH_TOKEN`）の設定を確認してください。
