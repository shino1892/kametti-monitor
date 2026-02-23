import type { CommandType, EventNameType } from '../../const/v2/socket.const'

/**
 * v2 프로토콜 WebSocket 메시지 래퍼
 */
export interface WebSocketMessage<T = unknown> {
  command: CommandType
  payload: T
  timestamp?: number
}

/**
 * MESSAGE 명령의 페이로드
 */
export interface MessagePayload {
  channelId: string
  userId: number
  body: string // JSON 문자열 (EventBody로 파싱됨)
  offset?: number
  unreachedCount?: number
  targetUserId?: number | null
  messageLevel?: number
}

/**
 * ACTIVATE_CHANNEL 명령의 페이로드
 */
export interface ActivateChannelPayload {
  channelId: string
  liveToken: string
}

/**
 * DEACTIVATE_CHANNEL 명령의 페이로드
 */
export interface DeactivateChannelPayload {
  channelId: string
}

/**
 * MESSAGE body 내부의 이벤트 구조
 */
export interface EventBody<T = unknown> {
  eventName: EventNameType
  eventPayload: T
}

// ============================================
// 이벤트 페이로드 타입들
// ============================================

/**
 * 사용자 기본 정보
 */
export interface UserInfo {
  id: number
  nickname: string
  profileUrl?: string
  isVip?: boolean
  isStaff?: boolean
  dateJoined?: string
  isDj?: boolean
  subscribeToDj?: boolean
  fanRank?: number | null
  vipGrade?: string | null
  regularScore?: number
  isManager?: boolean
}

/**
 * RoomJoin - 사용자 입장 이벤트
 */
export interface RoomJoinPayload {
  generator: UserInfo
}

/**
 * ChatMessage - 채팅 메시지 이벤트
 */
export interface ChatMessagePayload {
  message: string
  messageType: 'GENERAL_MESSAGE' | string
  messageStyle?: {
    subscriberBadgeColorCode?: string | null
    borderColorCode?: string | null
  }
  generator: UserInfo
}

/**
 * RoomKick - 강퇴/차단 이벤트
 */
export interface RoomKickPayload {
  targetUser: {
    id: number
    nickname: string
  }
  generatorId: number
  generator: {
    id: number
    nickname: string
  }
}

/**
 * LiveMetaUpdate - 방송 메타데이터 업데이트
 */
export interface LiveMetaUpdatePayload {
  title: string
  notice: string
  bgImageUrl: string
  isCalling: boolean
  isMute: boolean
  isFreeze: boolean
  isBlind: boolean
  allowsDonationMessage?: boolean
  chatIntervalLimit?: number
  spoonAimTitle?: string
  spoonAimCount?: number
  djId: number
  djNickname: string
  djProfileImageUrl?: string
  rank: string
  likeCount: number
  memberCount: number
  totalMemberCount?: number
  spoonCount: number
  streamStatus: 'PLAY' | 'PAUSE' | string
  topMembers?: Array<{
    memberId: number
    profileImageUrl: string
  }>
  managerIds?: number[]
}

/**
 * LiveDonation - 스티커 후원 이벤트
 */
export interface LiveDonationPayload {
  userId: number
  nickname: string
  profileUrl?: string
  sticker: string
  amount: number
  stickerType: 'STICKER' | 'DONATION' | string
  donationMessage?: string
  donationAudioUrl?: string
  voiceChangeType?: number
  combo?: number
}

/**
 * LiveFreeLike - 무료 좋아요 이벤트
 */
export interface LiveFreeLikePayload {
  userId: number
  nickname: string
  count: number
}

/**
 * LivePaidLike - 유료 좋아요 이벤트
 */
export interface LivePaidLikePayload {
  userId: number
  nickname: string
  stickerId: number
  sticker: string
  amount: number
}

/**
 * LiveItemUse - 아이템 사용 이벤트
 */
export interface LiveItemUsePayload {
  userId: number
  nickname: string
  itemId: number
  effectType: 'LIKE' | string
  itemImages?: string[]
  closeAirTime?: number
}

/**
 * LiveRank - 랭킹 변동 이벤트
 */
export interface LiveRankPayload {
  nowRank: string
  prevRank: string
  riseRank?: number
}

/**
 * 모든 이벤트 페이로드 유니온 타입
 */
export type AnyEventPayload =
  | RoomJoinPayload
  | ChatMessagePayload
  | RoomKickPayload
  | LiveMetaUpdatePayload
  | LiveDonationPayload
  | LiveFreeLikePayload
  | LivePaidLikePayload
  | LiveItemUsePayload
  | LiveRankPayload
