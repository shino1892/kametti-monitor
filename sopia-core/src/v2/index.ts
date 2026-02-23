/**
 * v2 Protocol (Heimdallr2)
 *
 * 스푼라디오 라이브 프로토콜 v2를 사용하는 클라이언트 및 타입들입니다.
 *
 * 주요 변경사항 (v1 대비):
 * - 채팅 전송: WebSocket → HTTP POST (Gateway API)
 * - 방 입장: ACTIVATE_CHANNEL 명령
 * - 방 퇴장: DEACTIVATE_CHANNEL 명령
 * - 이벤트: ChatMessage, RoomJoin, RoomKick, LiveMetaUpdate 등
 * - 채널 식별: live_id → channelId (stream_name)
 *
 * @example
 * ```typescript
 * import { SpoonV2 } from '@sopia-bot/core'
 *
 * const spoon = new SpoonV2('kr')
 * await spoon.init()
 * await spoon.setToken(token, refreshToken)
 *
 * // 방송 입장
 * await spoon.live.join(liveId)
 *
 * // 채팅 전송 (HTTP)
 * await spoon.live.message('안녕하세요!')
 *
 * // 이벤트 리스닝
 * spoon.live.on('ChatMessage', (payload) => {
 *   console.log(payload.generator.nickname, payload.message)
 * })
 *
 * // 방송 퇴장
 * await spoon.live.close()
 * ```
 */

// Client exports
export { SpoonV2, type SpoonConfigV2 } from '../client/v2/spoon.client'
export { LiveClientV2, type ChatMessageType } from '../client/v2/live.client'
export { WebSocketClientV2, type LiveSocketEventsV2 } from '../client/v2/websocket.client'

// Constant exports
export { Command, EventName, type CommandType, type EventNameType } from '../const/v2/socket.const'

// Struct exports
export type {
  WebSocketMessage,
  MessagePayload,
  ActivateChannelPayload,
  DeactivateChannelPayload,
  EventBody,
  UserInfo,
  RoomJoinPayload,
  ChatMessagePayload,
  RoomKickPayload,
  LiveMetaUpdatePayload,
  LiveDonationPayload,
  LiveFreeLikePayload,
  LivePaidLikePayload,
  LiveItemUsePayload,
  LiveRankPayload,
  AnyEventPayload
} from '../struct/v2/socket.struct'
