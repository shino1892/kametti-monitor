import { EventEmitter2 } from 'eventemitter2'
import WebSocket from 'ws'
import type { Spoon } from '../spoon.client'
import { Command, EventName, type EventNameType } from '../../const/v2/socket.const'
import type {
  WebSocketMessage,
  MessagePayload,
  ActivateChannelPayload,
  DeactivateChannelPayload,
  EventBody,
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
} from '../../struct/v2/socket.struct'
import { WebSocketFileLogger, type IWebSocketFileLogger } from '../../logger/file.logger'

/**
 * v2 프로토콜 이벤트 리스너 타입
 */
export type LiveSocketEventsV2 = {
  [EventName.ROOM_JOIN]: (payload: RoomJoinPayload, raw: MessagePayload) => void
  [EventName.CHAT_MESSAGE]: (payload: ChatMessagePayload, raw: MessagePayload) => void
  [EventName.ROOM_KICK]: (payload: RoomKickPayload, raw: MessagePayload) => void
  [EventName.LIVE_META_UPDATE]: (payload: LiveMetaUpdatePayload, raw: MessagePayload) => void
  [EventName.LIVE_DONATION]: (payload: LiveDonationPayload, raw: MessagePayload) => void
  [EventName.LIVE_FREE_LIKE]: (payload: LiveFreeLikePayload, raw: MessagePayload) => void
  [EventName.LIVE_PAID_LIKE]: (payload: LivePaidLikePayload, raw: MessagePayload) => void
  [EventName.LIVE_ITEM_USE]: (payload: LiveItemUsePayload, raw: MessagePayload) => void
  [EventName.LIVE_RANK]: (payload: LiveRankPayload, raw: MessagePayload) => void
  /** 모든 이벤트를 수신하는 와일드카드 이벤트 */
  'event:all': (eventName: EventNameType, payload: AnyEventPayload, raw: MessagePayload) => void
  /** 이벤트 처리 전 훅 */
  'hook:before': (eventName: EventNameType, payload: AnyEventPayload, raw: MessagePayload) => void
  /** 이벤트 처리 후 훅 */
  'hook:after': (eventName: EventNameType, payload: AnyEventPayload, raw: MessagePayload) => void
  /** 연결 성공 */
  'connected': () => void
  /** 연결 종료 */
  'disconnected': (code: number, reason: string) => void
  /** 에러 발생 */
  'error': (error: Error) => void
  /** 원본 메시지 수신 (디버깅용) */
  'raw': (data: string, parsed: WebSocketMessage<unknown> | null) => void
}

/**
 * v2 프로토콜 WebSocket 클라이언트
 */
export class WebSocketClientV2 extends EventEmitter2 {
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

  private ws: WebSocket | null = null
  private fileLogger: IWebSocketFileLogger | null = null

  constructor(protected spoon: Spoon) {
    super()
  }

  /**
   * 파일 로깅 활성화
   * @param filePath 로그 파일 경로
   */
  enableFileLogging(filePath: string): void {
    if (this.fileLogger) {
      this.fileLogger.disable()
    }
    this.fileLogger = new WebSocketFileLogger(filePath)
    this.fileLogger.enable()
    this.spoon.logger.info('[WebSocket v2] File logging enabled:', this.fileLogger.getFilePath())
  }

  /**
   * 파일 로깅 비활성화
   */
  disableFileLogging(): void {
    if (this.fileLogger) {
      this.fileLogger.disable()
      this.fileLogger = null
      this.spoon.logger.info('[WebSocket v2] File logging disabled')
    }
  }

  /**
   * 현재 로그 파일 경로 반환
   */
  getLogFilePath(): string | null {
    return this.fileLogger?.getFilePath() ?? null
  }

  /**
   * WebSocket 연결
   */
  connect(url: string, options: WebSocket.ClientOptions = {}): Promise<void> {
    return new Promise((resolve, reject) => {
      let isResolved = false

      try {
        this.ws = new WebSocket(url, options)

        this.ws.onopen = () => {
          isResolved = true
          this.spoon.logger.info('[WebSocket v2] Connected to:', url)
          this.emit('connected')
          resolve()
        }

        this.ws.onmessage = this.handleMessage.bind(this)

        this.ws.onclose = (event) => {
          this.spoon.logger.info('[WebSocket v2] Disconnected:', event.code, event.reason)
          this.emit('disconnected', event.code, event.reason)
        }

        this.ws.onerror = (event) => {
          const error = new Error('WebSocket error')
          this.spoon.logger.error('[WebSocket v2] Error:', error)
          this.emit('error', error)
          // 연결 성공 전에만 reject 호출 (이미 resolve된 경우 reject 호출 안 함)
          if (!isResolved) {
            reject(error)
          }
        }
      } catch (error) {
        this.spoon.logger.error('[WebSocket v2] Connection failed:', error)
        reject(error)
      }
    })
  }

  /**
   * 메시지 수신 핸들러
   */
  private async handleMessage(event: WebSocket.MessageEvent): Promise<void> {
    const rawData = event.data as string
    let parsedMessage: WebSocketMessage<MessagePayload> | null = null

    try {
      parsedMessage = JSON.parse(rawData)
    } catch (parseError) {
      this.spoon.logger.error('[WebSocket v2] JSON parse error:', parseError, 'Raw:', rawData)
      this.emit('raw', rawData, null)
      return
    }

    // raw 이벤트 발생 (디버깅용)
    this.emit('raw', rawData, parsedMessage)

    if (!parsedMessage) {
      return
    }

    this.spoon.logger.debug('[WebSocket v2] Received command:', parsedMessage.command)

    // 파일 로깅 (수신)
    if (this.fileLogger) {
      this.fileLogger.logReceive(parsedMessage.command, parsedMessage.payload, rawData)
    }

    try {
      if (parsedMessage.command === Command.MESSAGE) {
        const payload = parsedMessage.payload
        const eventBody: EventBody<AnyEventPayload> = JSON.parse(payload.body)

        const eventName = eventBody.eventName as EventNameType
        const eventPayload = eventBody.eventPayload

        // 파일 로깅 (이벤트 상세)
        if (this.fileLogger) {
          this.fileLogger.logReceive(`EVENT:${eventName}`, eventPayload, payload.body)
        }

        // LivePlayMailbox / LivePlayPoll 이벤트 이름 변환
        // 소켓에서는 단일 이벤트로 오지만, 내부적으로 Start/Update/End로 분리
        let transformedEventName: string = eventName
        const eventNameStr = eventName as string
        if (eventNameStr === 'LivePlayMailbox') {
          const command = (eventPayload as { mailboxCommand?: string }).mailboxCommand
          if (command === 'START') transformedEventName = 'LivePlayMailboxStart'
          else if (command === 'UPDATE') transformedEventName = 'LivePlayMailboxUpdate'
          else if (command === 'END') transformedEventName = 'LivePlayMailboxEnd'
        } else if (eventNameStr === 'LivePlayPoll') {
          const command = (eventPayload as { pollCommand?: string }).pollCommand
          if (command === 'START') transformedEventName = 'LivePlayPollStart'
          else if (command === 'UPDATE') transformedEventName = 'LivePlayPollUpdate'
          else if (command === 'END') transformedEventName = 'LivePlayPollEnd'
        }

        // hook:before 이벤트 발생
        await this.emitAsync('hook:before', transformedEventName as EventNameType, eventPayload, payload)

        // 개별 이벤트 발생
        switch (eventName) {
          case EventName.ROOM_JOIN:
            this.emit(EventName.ROOM_JOIN, eventPayload as RoomJoinPayload, payload)
            break
          case EventName.CHAT_MESSAGE:
            this.emit(EventName.CHAT_MESSAGE, eventPayload as ChatMessagePayload, payload)
            break
          case EventName.ROOM_KICK:
            this.emit(EventName.ROOM_KICK, eventPayload as RoomKickPayload, payload)
            break
          case EventName.LIVE_META_UPDATE:
            this.emit(EventName.LIVE_META_UPDATE, eventPayload as LiveMetaUpdatePayload, payload)
            break
          case EventName.LIVE_DONATION:
            this.emit(EventName.LIVE_DONATION, eventPayload as LiveDonationPayload, payload)
            break
          case EventName.LIVE_FREE_LIKE:
            this.emit(EventName.LIVE_FREE_LIKE, eventPayload as LiveFreeLikePayload, payload)
            break
          case EventName.LIVE_PAID_LIKE:
            this.emit(EventName.LIVE_PAID_LIKE, eventPayload as LivePaidLikePayload, payload)
            break
          case EventName.LIVE_ITEM_USE:
            this.emit(EventName.LIVE_ITEM_USE, eventPayload as LiveItemUsePayload, payload)
            break
          case EventName.LIVE_RANK:
            this.emit(EventName.LIVE_RANK, eventPayload as LiveRankPayload, payload)
            break
        }

        // 와일드카드 이벤트 발생 (변환된 이벤트 이름 사용)
        this.emit('event:all', transformedEventName as EventNameType, eventPayload, payload)

        // hook:after 이벤트 발생
        await this.emitAsync('hook:after', transformedEventName as EventNameType, eventPayload, payload)
      }
    } catch (error) {
      this.spoon.logger.error('[WebSocket v2] Message parse error:', error)
    }
  }

  /**
   * WebSocket 메시지 전송
   */
  send<T>(message: WebSocketMessage<T>): void {
    this.spoon.logger.info('[WebSocket v2] send() called, command:', message.command)
    this.spoon.logger.info('[WebSocket v2] ws exists:', !!this.ws, 'readyState:', this.ws?.readyState, 'OPEN:', WebSocket.OPEN)

    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.spoon.logger.warn('[WebSocket v2] Cannot send - not connected')
      return
    }

    const data = JSON.stringify(message)
    this.spoon.logger.info('[WebSocket v2] Sending:', data)

    // 파일 로깅 (송신)
    if (this.fileLogger) {
      this.fileLogger.logSend(message.command, message.payload)
    }

    this.ws.send(data)
  }

  /**
   * 채널 활성화 (방 입장)
   */
  activateChannel(channelId: string, liveToken: string): void {
    this.spoon.logger.info('[WebSocket v2] activateChannel called')
    this.spoon.logger.info('[WebSocket v2] channelId:', channelId)
    this.spoon.logger.info('[WebSocket v2] liveToken:', liveToken ? `${liveToken.substring(0, 20)}...` : 'NULL/UNDEFINED')

    const message: WebSocketMessage<ActivateChannelPayload> = {
      command: Command.ACTIVATE_CHANNEL,
      payload: {
        channelId,
        liveToken
      }
    }
    this.send(message)
  }

  /**
   * 채널 비활성화 (방 퇴장)
   */
  deactivateChannel(channelId: string): void {
    const message: WebSocketMessage<DeactivateChannelPayload> = {
      command: Command.DEACTIVATE_CHANNEL,
      payload: {
        channelId
      }
    }
    this.send(message)
  }

  /**
   * WebSocket 연결 종료
   */
  disconnect(): void {
    // 파일 로깅 비활성화
    // this.disableFileLogging()

    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }

  /**
   * 연결 상태 확인
   */
  get isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN
  }
}
