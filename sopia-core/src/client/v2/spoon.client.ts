import { Country, type CountryType } from '../../const/country.const'
import { ConsoleLogger, type ILogger, LogLevel } from '../../logger'
import { ApiUrls } from '../../struct/api.struct'
import { SpoonCountry } from '../../struct/spoon.struct'
import type { User } from '../../struct/user.struct'
import { ApiClient } from '../api.client'
import { GatewayClient } from '../gw.client'
import { HttpClient } from '../http.client'
import { StickerClient } from '../sticker.client'
import { LiveClientV2 } from './live.client'
import { WebSocketClientV2 } from './websocket.client'
import EventEmitter2 from 'eventemitter2'
import { CountryNumber } from '../../const/country.const'
import type { SnsValueType } from '../../const/sns-type.const'

export type { ILogger } from '../../logger'

export interface SpoonConfigV2 {
  logger?: ILogger
  logLevel?: LogLevel
  appVersion?: string
  userAgent?: string
}

/**
 * Spoon 클라이언트 v2
 *
 * Heimdallr2 프로토콜을 사용하는 Spoon 클라이언트입니다.
 * - 채팅: HTTP POST (Gateway API)
 * - WebSocket: 로그인 시 연결, ACTIVATE_CHANNEL / DEACTIVATE_CHANNEL 명령
 * - 이벤트: ChatMessage, RoomJoin, RoomKick, LiveMetaUpdate 등
 */
export class SpoonV2 extends EventEmitter2 {
  public urls!: ApiUrls
  private httpClient!: HttpClient
  private apiClient!: ApiClient
  private liveClientV2!: LiveClientV2
  private gatewayClient!: GatewayClient
  private stickerClient!: StickerClient
  private wsClient!: WebSocketClientV2
  public token!: string
  public refreshToken!: string
  public deviceUniqueId!: string
  public logonUser!: User
  public appVersion: string
  public logger: ILogger

  constructor(
    public country: CountryType = Country.KOREA,
    config: SpoonConfigV2 = {}
  ) {
    super()
    this.logger = config.logger ?? new ConsoleLogger(config.logLevel ?? LogLevel.DEBUG)
    this.appVersion = config.appVersion ?? '10.10.2'
  }

  get api(): ApiClient {
    return this.apiClient
  }

  /**
   * v2 Live 클라이언트
   */
  get live(): LiveClientV2 {
    return this.liveClientV2
  }

  /**
   * v2 WebSocket 클라이언트 (로그인 시 연결됨)
   */
  get ws(): WebSocketClientV2 {
    return this.wsClient
  }

  get gw(): GatewayClient {
    return this.gatewayClient
  }

  get http(): HttpClient {
    return this.httpClient
  }

  get sticker(): StickerClient {
    return this.stickerClient
  }

  /**
   * Logger 설정
   */
  setLogger(logger: ILogger): void {
    this.logger = logger
    if (this.httpClient) {
      this.httpClient.logger = logger
    }
    if (this.apiClient?.instance?.httpClient) {
      this.apiClient.instance.httpClient.logger = logger
    }
    if (this.gatewayClient?.instance?.httpClient) {
      this.gatewayClient.instance.httpClient.logger = logger
    }
  }

  async initUrlsInfo() {
    this.urls = await this.httpClient.request<ApiUrls>(
      `/config/api/${this.country}.json`,
      {
        method: 'GET',
        params: {
          ts: Date.now()
        }
      },
      ApiUrls
    )
    if (!this.urls.authUrl) {
      this.urls.authUrl = `https://${this.country}-auth.spooncast.net`
    }
  }

  async getClientCountry() {
    const response = await this.httpClient.request<SpoonCountry>(
      '/country',
      {
        method: 'GET'
      },
      SpoonCountry
    )
    this.country = response.code.toLowerCase() as CountryType
  }

  async init() {
    this.httpClient = new HttpClient('https://www.spooncast.net/', {}, this.logger)
    this.deviceUniqueId = this.httpClient.userAgent.toLowerCase()
    await this.getClientCountry()
    await this.initUrlsInfo()
    this.apiClient = new ApiClient(this as any)
    this.wsClient = new WebSocketClientV2(this as any)
    this.liveClientV2 = new LiveClientV2(this as any, this.wsClient)
    this.gatewayClient = new GatewayClient(this as any)
    this.stickerClient = new StickerClient(this as any)
    await this.stickerClient.initSticker()
  }

  /**
   * WebSocket URL 생성
   * wss://{country}-wala.spooncast.net/ws?token={userToken}
   */
  private getWebSocketUrl(): string {
    return `wss://${this.country}-wala.spooncast.net/ws?token=${this.token}`
  }

  /**
   * WebSocket 연결 (로그인 후 호출)
   */
  async connectWebSocket(): Promise<void> {
    const wsUrl = this.getWebSocketUrl()
    this.logger.info('[SpoonV2] Connecting WebSocket:', wsUrl.replace(this.token, 'TOKEN...'))
    await this.wsClient.connect(wsUrl)
    this.logger.info('[SpoonV2] WebSocket connected')
  }

  /**
   * WebSocket 연결 종료
   */
  disconnectWebSocket(): void {
    this.wsClient.disconnect()
    this.logger.info('[SpoonV2] WebSocket disconnected')
  }

  async initToken(sns_id: string | number, password: string, sns_type: SnsValueType) {
    const code = CountryNumber[this.country.toUpperCase() as keyof typeof CountryNumber]
    const res = await this.httpClient.request<{ data: { jwt: string; refreshToken: string } }>(
      `${this.urls.authUrl}/tokens/`,
      {
        method: 'POST',
        body: {
          auth_data: {
            act_type: sns_type,
            password,
            msisdn: Number(code + sns_id)
          },
          device_unique_id: this.deviceUniqueId
        }
      }
    )
    return await this.setToken(res.data.jwt, res.data.refreshToken)
  }

  async tokenRefresh() {
    const res = await this.httpClient.request<{ data: { jwt: string; refreshToken: string } }>(
      `${this.urls.authUrl}/tokens/`,
      {
        method: 'PUT',
        body: {
          user_id: this.logonUser.id,
          refresh_token: this.refreshToken,
          device_unique_id: this.deviceUniqueId
        }
      }
    )
    this.logger.debug('Token refresh response:', res)
    if (!res?.data?.jwt) {
      this.logger.error('Token refresh failed: No JWT in response')
      this.emit('error.token')
      return false
    }
    return await this.setToken(res.data.jwt)
  }

  async setToken(token: string, refreshToken?: string, assignUserId?: number) {
    this.token = token
    if (refreshToken) {
      this.refreshToken = refreshToken
    }
    this.api.instance.httpClient.appendBaseConfig({
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
    this.gw.instance.httpClient.appendBaseConfig({
      headers: {
        Authorization: `Bearer ${token}`
      }
    })

    const payload = token.split('.')[1]
    const decodedPayload = JSON.parse(Buffer.from(payload, 'base64').toString())
    this.deviceUniqueId = decodedPayload.did

    // JWT에서 userId 추출 (tokenRefresh에서 필요하므로 먼저 설정)
    const userId = assignUserId || decodedPayload.sub

    // 임시로 logonUser 설정 (tokenRefresh가 호출될 경우를 대비)
    if (!this.logonUser) {
      this.logonUser = { id: userId } as User
    } else {
      this.logonUser.id = userId
    }

    // 전체 유저 정보 가져오기 (assignUserId가 없는 경우에만)
    if (!assignUserId) {
      try {
        this.logonUser = await this.api.user.getUserInfo(userId)
      } catch (error) {
        this.logger.error('Failed to get user info:', error)
        // 실패해도 기본 정보는 유지
      }
    }

    // WebSocket 연결 (로그인 후 자동 연결)
    try {
      await this.connectWebSocket()
    } catch (error) {
      this.logger.error('[SpoonV2] WebSocket connection failed:', error)
      // WebSocket 연결 실패해도 로그인은 성공으로 처리
      // 라이브 입장 시 다시 연결 시도됨
    }

    return true
  }
}
