/**
 * 스푼라디오 라이브 소켓 이벤트 상수
 *
 * 라이브 방송 중 발생하는 다양한 소켓 이벤트들의 이름을 정의합니다.
 * 소켓 연결 시 이벤트 리스너 등록이나 이벤트 발송 시 사용됩니다.
 */
export const LiveEvent = {
  /** 라이브 방송 상태 변경 이벤트 */
  LIVE_STATE: 'live_state',
  /** 라이브 방송 연결 상태 확인 이벤트 */
  LIVE_HEALTH: 'live_health',
  /** 사용자가 라이브 방송에 입장했을 때 발생하는 이벤트 */
  LIVE_JOIN: 'live_join',
  /** 사용자가 라이브 방송에 숨은 입장했을 때 발생하는 이벤트 */
  LIVE_SHADOWJOIN: 'live_shadowjoin',
  /** 라이브 방송 채팅 메시지 이벤트 */
  LIVE_MESSAGE: 'live_message',
  /** 라이브 방송 하트(좋아요) 이벤트 */
  LIVE_LIKE: 'live_like',
  /** 사용자 차단 이벤트 */
  LIVE_BLOCK: 'live_block',
  /** 라이브 방송 정보 업데이트 이벤트 */
  LIVE_UPDATE: 'live_update',
  /** 사용자가 라이브 방송에서 퇴장했을 때 발생하는 이벤트 */
  LIVE_LEAVE: 'live_leave',
  /** 선물 아이템 사용 이벤트 */
  LIVE_PRESENT: 'live_present',
  /** 통화 연결 이벤트 */
  LIVE_CALL: 'live_call',
  /** 통화 요청 이벤트 */
  LIVE_CALL_REQUEST: 'live_call_request',
  /** 라이브 방송 종료 이벤트 */
  LIVE_CLOSED: 'live_closed',
  /** 라이브 방송 서버 장애 복구 이벤트 */
  LIVE_FAILOVER: 'live_failover',
  /** 사용자 랭킹 변경 이벤트 */
  LIVE_RANK: 'live_rank',
  /** 랭킹 목록 업데이트 이벤트 */
  LIVE_RANKLIST: 'live_ranklist',
  /** 라이브 방송 명령어 이벤트 */
  LIVE_COMMAND: 'live_command',
  /** 라이브 방송 강제 종료 이벤트 */
  LIVE_FORCE_CLOSE: 'live_force_close',
  /** 라이브 방송 재생 이벤트 */
  LIVE_PLAY: 'live_play',
  /** 지연된 업데이트 이벤트 */
  LIVE_LAZY_UPDATE: 'lazy_update',
  /** 선물 아이템에 대한 하트(좋아요) 이벤트 */
  LIVE_PRESENT_LIKE: 'live_present_like',
  /** 모든 라이브 이벤트를 수신하는 이벤트 */
  LIVE_EVENT_ALL: 'live_event_all',
  /** 아이템 사용 이벤트 */
  LIVE_USE_ITEM: 'use_item',

  // 게임 및 이벤트 관련
  /** 럭키박스 생성 이벤트 */
  LIVE_LUCKYBOX_CREATE: 'luckybox_create',
  /** 럭키박스 참여 이벤트 */
  LIVE_LUCKYBOX_ACCEPT: 'luckybox_accept',
  /** 럭키박스 결과 이벤트 */
  LIVE_LUCKYBOX_RESULT: 'luckybox_result',
  /** 퀴즈 생성 이벤트 */
  LIVE_QUIZ_CREATE: 'quiz_create',
  /** 퀴즈 참여 이벤트 */
  LIVE_QUIZ_ACCEPT: 'quiz_accept',
  /** 퀴즈 결과 이벤트 */
  LIVE_QUIZ_RESULT: 'quiz_result',
  /** 후원 트레이 이벤트 */
  LIVE_DONATION_TRAY: 'donation_tray',

  /** 우편함 시작 이벤트 */
  LIVE_MAILBOX_START: 'mailbox_start',
  /** 우편함 업데이트 이벤트 */
  LIVE_MAILBOX_UPDATE: 'mailbox_update',
  /** 우편함 종료 이벤트 */
  LIVE_MAILBOX_END: 'mailbox_end',

  /** 투표 시작 이벤트 */
  LIVE_POLL_START: 'poll_start',
  /** 투표 업데이트 이벤트 */
  LIVE_POLL_UPDATE: 'poll_update',
  /** 투표 종료 이벤트 */
  LIVE_POLL_END: 'poll_end'
} as const

/**
 * 스푼라디오 라이브 소켓 메시지 타입 상수
 *
 * 소켓 통신 시 메시지의 타입을 구분하기 위해 사용되는 상수들입니다.
 * 요청, 보고, 응답 등의 메시지 유형을 정의합니다.
 */
export const LiveType = {
  /** 라이브 요청 메시지 타입 */
  LIVE_REQ: 'live_req',
  /** 라이브 보고 메시지 타입 */
  LIVE_RPT: 'live_rpt',
  /** 라이브 응답 메시지 타입 */
  LIVE_RSP: 'live_rsp'
} as const
