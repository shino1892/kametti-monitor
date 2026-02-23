/**
 * 스푼라디오 라이브 프로토콜 v2 (Heimdallr2) 상수
 *
 * WebSocket 명령어와 이벤트 이름을 정의합니다.
 */

/**
 * WebSocket 명령어 타입
 */
export const Command = {
  /** 채널 활성화 (방 입장) */
  ACTIVATE_CHANNEL: 'ACTIVATE_CHANNEL',
  /** 채널 비활성화 (방 퇴장) */
  DEACTIVATE_CHANNEL: 'DEACTIVATE_CHANNEL',
  /** 메시지 수신 */
  MESSAGE: 'MESSAGE'
} as const

export type CommandType = (typeof Command)[keyof typeof Command]

/**
 * 수신 이벤트 이름 (payload.body 내부의 eventName)
 */
export const EventName = {
  /** 채팅 메시지 */
  CHAT_MESSAGE: 'ChatMessage',
  /** 사용자 입장 */
  ROOM_JOIN: 'RoomJoin',
  /** 사용자 강퇴/차단 */
  ROOM_KICK: 'RoomKick',
  /** 방송 메타데이터 업데이트 */
  LIVE_META_UPDATE: 'LiveMetaUpdate',
  /** 스티커 후원 */
  LIVE_DONATION: 'LiveDonation',
  /** 무료 좋아요 */
  LIVE_FREE_LIKE: 'LiveFreeLike',
  /** 유료 좋아요 */
  LIVE_PAID_LIKE: 'LivePaidLike',
  /** 아이템 사용 */
  LIVE_ITEM_USE: 'LiveItemUse',
  /** 랭킹 변동 */
  LIVE_RANK: 'LiveRank',

  // 럭키박스/퀴즈 이벤트
  /** 도네이션 트레이 (럭키박스/퀴즈 생성 알림) */
  DONATION_TRAY: 'DonationTray',
  /** 럭키박스 수락 (DJ가 럭키박스 열기) */
  LUCKY_BOX_ACCEPT: 'LuckyBoxAccept',
  /** 럭키박스 결과 */
  LUCKY_BOX_RESULT: 'LuckyBoxResult',
  /** 퀴즈 수락 (DJ가 퀴즈 열기) */
  QUIZ_ACCEPT: 'QuizAccept',
  /** 퀴즈 결과 */
  QUIZ_RESULT: 'QuizResult'
} as const

export type EventNameType = (typeof EventName)[keyof typeof EventName]
