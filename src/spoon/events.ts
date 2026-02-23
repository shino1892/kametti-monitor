/**
 * Spoon Radio ライブプロトコル v2（Heimdallr2）定数
 *
 * WebSocket のコマンドとイベント名を定義します。
 */

/**
 * WebSocket コマンド種別
 */
export const Command = {
  /** チャンネル有効化（入室） */
  ACTIVATE_CHANNEL: 'ACTIVATE_CHANNEL',
  /** チャンネル無効化（退室） */
  DEACTIVATE_CHANNEL: 'DEACTIVATE_CHANNEL',
  /** メッセージ受信 */
  MESSAGE: 'MESSAGE'
} as const

export type CommandType = (typeof Command)[keyof typeof Command]

/**
 * 受信イベント名（payload.body 内の eventName）
 */
export const EventName = {
  /** チャットメッセージ */
  CHAT_MESSAGE: 'ChatMessage',
  /** ユーザー入室 */
  ROOM_JOIN: 'RoomJoin',
  /** ユーザーのキック/ブロック */
  ROOM_KICK: 'RoomKick',
  /** 配信メタデータ更新 */
  LIVE_META_UPDATE: 'LiveMetaUpdate',
  /** ステッカー支援 */
  LIVE_DONATION: 'LiveDonation',
  /** 無料いいね */
  LIVE_FREE_LIKE: 'LiveFreeLike',
  /** 有料いいね */
  LIVE_PAID_LIKE: 'LivePaidLike',
  /** アイテム使用 */
  LIVE_ITEM_USE: 'LiveItemUse',
  /** ランキング変動 */
  LIVE_RANK: 'LiveRank',

  // ラッキーボックス/クイズイベント
  /** ドネーショントレイ（ラッキーボックス/クイズ作成通知） */
  DONATION_TRAY: 'DonationTray',
  /** ラッキーボックス受付（DJがラッキーボックスを開く） */
  LUCKY_BOX_ACCEPT: 'LuckyBoxAccept',
  /** ラッキーボックス結果 */
  LUCKY_BOX_RESULT: 'LuckyBoxResult',
  /** クイズ受付（DJがクイズを開く） */
  QUIZ_ACCEPT: 'QuizAccept',
  /** クイズ結果 */
  QUIZ_RESULT: 'QuizResult'
} as const

export type EventNameType = (typeof EventName)[keyof typeof EventName]
