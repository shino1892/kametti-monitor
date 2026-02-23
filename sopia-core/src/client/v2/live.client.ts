import { merge } from 'lodash'
import { EventEmitter2 } from 'eventemitter2'
import type { Spoon } from '../spoon.client'
import type { WebSocketClientV2, LiveSocketEventsV2 } from './websocket.client'
import { EventName } from '../../const/v2/socket.const'
import { Live } from '../../struct/live.struct'
import type { LiveMetaUpdatePayload } from '../../struct/v2/socket.struct'

/**
 * v2 프로토콜 채팅 메시지 타입
 */
export type ChatMessageType = 'GENERAL_MESSAGE'

/**
 * v2 프로토콜 Live 클라이언트
 *
 * Heimdallr2 프로토콜을 사용하여 라이브 방송에 연결합니다.
 * - WebSocket: SpoonV2에서 로그인 시 연결된 공유 WebSocket 사용
 * - 방 입장/퇴장: ACTIVATE_CHANNEL / DEACTIVATE_CHANNEL 명령 전송
 * - 채팅 전송: HTTP POST (Gateway API)
 * - 좋아요/후원: HTTP POST (API)
 */
export class LiveClientV2 extends EventEmitter2 {
  declare emit: <K extends keyof LiveSocketEventsV2>(
    event: K,
    ...args: Parameters<LiveSocketEventsV2[K]>
  ) => boolean

  declare on: <K extends keyof LiveSocketEventsV2>(
    event: K,
    listener: LiveSocketEventsV2[K]
  ) => this

  declare once: <K extends keyof LiveSocketEventsV2>(
    event: K,
    listener: LiveSocketEventsV2[K]
  ) => this

  declare off: <K extends keyof LiveSocketEventsV2>(
    event: K,
    listener: LiveSocketEventsV2[K]
  ) => this

  private currentLive: Live | null = null
  private roomJwt: string | null = null
  private channelId: string | null = null

  constructor(
    protected spoon: Spoon,
    private wsClient: WebSocketClientV2
  ) {
    super()
    this.setupEventForwarding()

    // 기본 error 핸들러 등록 (join() 전에 발생하는 에러도 처리)
    // EventEmitter에서 error 이벤트에 리스너가 없으면 throw되므로 기본 핸들러 필요
    this.on('error', (error) => {
      this.spoon.logger.error('[LiveClient v2] Unhandled error:', error)
    })
  }

  /**
   * WebSocket 이벤트를 LiveClientV2로 전달
   */
  private setupEventForwarding(): void {
    // 공유 WebSocket의 모든 이벤트를 LiveClientV2로 전달
    this.wsClient.on('event:all', (eventName, payload, raw) => {
      // 현재 라이브에 입장한 경우에만 이벤트 전달
      if (this.channelId && raw.channelId === this.channelId) {
        this.emit('event:all', eventName, payload, raw)
      }
    })

    // 개별 이벤트 전달
    const eventNames = [
      EventName.CHAT_MESSAGE,
      EventName.ROOM_JOIN,
      EventName.ROOM_KICK,
      EventName.LIVE_META_UPDATE,
      EventName.LIVE_DONATION,
      EventName.LIVE_FREE_LIKE,
      EventName.LIVE_PAID_LIKE,
      EventName.LIVE_ITEM_USE,
      EventName.LIVE_RANK
    ] as const

    for (const eventName of eventNames) {
      this.wsClient.on(eventName, (payload: any, raw: any) => {
        // 현재 라이브에 입장한 경우에만 이벤트 전달
        if (this.channelId && raw.channelId === this.channelId) {
          this.emit(eventName, payload, raw)
        }
      })
    }

    // 연결 상태 이벤트 전달
    this.wsClient.on('connected', () => this.emit('connected'))
    this.wsClient.on('disconnected', (code, reason) => this.emit('disconnected', code, reason))
    this.wsClient.on('error', (error) => this.emit('error', error))
    this.wsClient.on('raw', (data, parsed) => this.emit('raw', data, parsed))
    this.wsClient.on('hook:before', (eventName, payload, raw) => {
      if (this.channelId && raw.channelId === this.channelId) {
        this.emit('hook:before', eventName, payload, raw)
      }
    })
    this.wsClient.on('hook:after', (eventName, payload, raw) => {
      if (this.channelId && raw.channelId === this.channelId) {
        this.emit('hook:after', eventName, payload, raw)
      }
    })
  }

  /**
   * 현재 라이브 정보
   */
  get info(): Live | null {
    return this.currentLive
  }

  /**
   * 현재 채널 ID (stream_name)
   */
  get channel(): string | null {
    return this.channelId
  }

  /**
   * WebSocket 연결 상태
   */
  get isConnected(): boolean {
    return this.wsClient.isConnected
  }

  /**
   * WebSocket 클라이언트 접근자
   * 디버깅 목적으로 파일 로깅 등을 활성화할 때 사용
   */
  get ws(): WebSocketClientV2 {
    return this.wsClient
  }

  /**
   * 라이브 방송 입장
   * @param live - 라이브 ID 또는 Live 객체
   */
  async join(live: number | Live): Promise<LiveClientV2> {
    // 1. Live ID인 경우 토큰 먼저 발급
    const liveId = live instanceof Live ? live.id : live

    // 2. 토큰 발급
    const token = await this.spoon.api.live.getLiveToken(liveId)
    this.roomJwt = token.jwt

    // 3. 라이브 정보 조회 (x-live-authorization 불필요)
    let liveInfo: Live
    if (live instanceof Live) {
      liveInfo = live
    } else {
      liveInfo = await this.spoon.api.live.getInfo(liveId)
    }

    if (!liveInfo) {
      throw new Error('Live info not found')
    }

    // JWT 토큰을 liveInfo에 설정 (아이템 사용 등 API 호출 시 필요)
    liveInfo.jwt = this.roomJwt!

    this.currentLive = liveInfo
    this.channelId = liveInfo.stream_name

    // 4. WebSocket 연결 확인 및 재연결
    if (!this.wsClient.isConnected) {
      this.spoon.logger.info('[LiveClient v2] WebSocket not connected, reconnecting...')
      await (this.spoon as any).connectWebSocket()
    }

    // 5. ACTIVATE_CHANNEL 전송 (공유 WebSocket 사용)
    this.wsClient.activateChannel(this.channelId!, this.roomJwt!)

    // 6. LiveMetaUpdate 이벤트로 라이브 정보 업데이트
    this.on(EventName.LIVE_META_UPDATE, (payload: LiveMetaUpdatePayload) => {
      if (this.currentLive) {
        this.currentLive = merge(this.currentLive, {
          title: payload.title,
          welcome_message: payload.notice,
          img_url: payload.bgImageUrl,
          is_call: payload.isCalling,
          is_mute: payload.isMute,
          is_freeze: payload.isFreeze,
          like_count: payload.likeCount,
          member_count: payload.memberCount,
          total_member_count: payload.totalMemberCount,
          total_spoon_count: payload.spoonCount,
          manager_ids: payload.managerIds
        })
      }
    })

    // 7. RoomJoin 이벤트에 매니저 정보 추가
    this.on('hook:before', (eventName, payload: any) => {
      if (payload?.generator) {
        if (this.currentLive?.manager_ids?.length) {
          payload.generator.isManager = this.currentLive.manager_ids.includes(payload.generator.id)
        } else {
          payload.generator.isManager = false
        }
      }
    })

    this.spoon.logger.info('[LiveClient v2] Joined live:', liveInfo.id)
    return this
  }

  /**
   * 라이브 방송 퇴장
   * @param skipCloseApi - true이면 방송 종료 API를 호출하지 않음 (BroadcastService에서 이미 호출한 경우)
   */
  async close(skipCloseApi: boolean = false): Promise<void> {
    if (this.channelId) {
      // DEACTIVATE_CHANNEL 전송 (WebSocket은 유지)
      this.wsClient.deactivateChannel(this.channelId)
    }

    // DJ인 경우 방송 종료 API 호출 (skipCloseApi가 false일 때만)
    if (!skipCloseApi && this.currentLive?.author.id === this.spoon.logonUser.id) {
      await this.spoon.api.live.close(this.currentLive)
    }

    this.currentLive = null
    this.channelId = null
    this.roomJwt = null
    // WebSocket은 끊지 않음 (공유 연결)
  }

  /**
   * 채팅 메시지 전송 (HTTP POST)
   * @param message - 전송할 메시지
   * @param messageType - 메시지 타입 (기본값: GENERAL_MESSAGE)
   */
  async message(message: string, messageType: ChatMessageType = 'GENERAL_MESSAGE'): Promise<void> {
    if (!this.channelId || !this.roomJwt) {
      throw new Error('Not joined to any live')
    }

    await this.spoon.gw.instance.httpClient.request(
      `/lives/${this.channelId}/chat/message`,
      {
        method: 'POST',
        headers: {
          'x-live-authorization': `Bearer ${this.roomJwt}`
        },
        body: {
          message,
          messageType
        }
      }
    )

    this.spoon.logger.debug('[LiveClient v2] Chat sent:', message)
  }

  /**
   * 좋아요 전송 (HTTP POST)
   */
  async like(): Promise<void> {
    if (!this.currentLive || !this.roomJwt) {
      throw new Error('Not joined to any live')
    }

    await this.spoon.api.instance.httpClient.request(
      `/lives/${this.currentLive.id}/like/`,
      {
        method: 'POST',
        headers: {
          'x-live-authorization': `Bearer ${this.roomJwt}`
        }
      }
    )

    this.spoon.logger.debug('[LiveClient v2] Like sent')
  }

  /**
   * 좋아요 상태 확인
   */
  async getLikeStatus(): Promise<{ expired_sec: number }> {
    if (!this.currentLive || !this.roomJwt) {
      throw new Error('Not joined to any live')
    }

    const response = await this.spoon.api.instance.httpClient.request<{ expired_sec: number }>(
      `/lives/${this.currentLive.id}/like/me/`,
      {
        method: 'GET',
        headers: {
          'x-live-authorization': `Bearer ${this.roomJwt}`
        }
      }
    )

    return response
  }

  /**
   * 스티커 후원
   * @param sticker - 스티커 ID (예: 'sticker_kr_cm25_cocktail')
   * @param amount - 수량
   * @param combo - 콤보 횟수
   */
  async present(sticker: string, amount: number = 1, combo: number = 1): Promise<void> {
    if (!this.currentLive || !this.roomJwt) {
      throw new Error('Not joined to any live')
    }

    await this.spoon.api.instance.httpClient.request(
      `/lives/${this.currentLive.id}/present/`,
      {
        method: 'POST',
        headers: {
          'x-live-authorization': `Bearer ${this.roomJwt}`
        },
        body: {
          sticker,
          amount,
          combo
        }
      }
    )

    this.spoon.logger.debug('[LiveClient v2] Present sent:', sticker, amount)
  }

  /**
   * TTS 후원 (도네이션 메시지)
   * @param message - 메시지 내용
   * @param amount - 스푼 수량
   */
  async donation(message: string, amount: number = 10): Promise<void> {
    if (!this.currentLive || !this.roomJwt) {
      throw new Error('Not joined to any live')
    }

    await this.spoon.api.instance.httpClient.request(
      `/lives/${this.currentLive.id}/present/donation/`,
      {
        method: 'POST',
        headers: {
          'x-live-authorization': `Bearer ${this.roomJwt}`
        },
        body: {
          sticker: 'sticker_kr_donationtts',
          amount,
          message,
          type: 2
        }
      }
    )

    this.spoon.logger.debug('[LiveClient v2] Donation sent:', message, amount)
  }
}
