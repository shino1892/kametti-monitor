import EventEmitter2 from 'eventemitter2'
import { Country, CountryNumber, type CountryType } from '../const/country.const'
import type { SnsValueType } from '../const/sns-type.const'
import { ConsoleLogger, type ILogger, LogLevel } from '../logger'
export type { ILogger } from '../logger'
import { ApiUrls } from '../struct/api.struct'
import { SpoonCountry } from '../struct/spoon.struct'
import type { User } from '../struct/user.struct'
import { ApiClient } from './api.client'
import { GatewayClient } from './gw.client'
import { HttpClient } from './http.client'
import { LiveClient } from './live.client'
import { StickerClient } from './sticker.client'

export interface SpoonConfig {
  logger?: ILogger
  logLevel?: LogLevel
  appVersion?: string
  userAgent?: string
}

export class Spoon extends EventEmitter2 {
  public urls!: ApiUrls
  private httpClient!: HttpClient
  private apiClient!: ApiClient
  private liveClient!: LiveClient
  private gatewayClient!: GatewayClient
  private stickerClient!: StickerClient
  public token!: string
  public refreshToken!: string
  public deviceUniqueId!: string
  public logonUser!: User
  public appVersion: string
  public logger: ILogger

  constructor(
    public country: CountryType = Country.KOREA,
    config: SpoonConfig = {}
  ) {
    super()
    this.logger = config.logger ?? new ConsoleLogger(config.logLevel ?? LogLevel.DEBUG)
    this.appVersion = config.appVersion ?? '10.10.2'
  }

  get api(): ApiClient {
    return this.apiClient
  }

  get live(): LiveClient {
    return this.liveClient
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
   * 외부에서 커스텀 로거를 주입할 수 있습니다.
   * API, Gateway, WebSocket 등 모든 클라이언트에 적용됩니다.
   */
  setLogger(logger: ILogger): void {
    this.logger = logger
    // Main HTTP client
    if (this.httpClient) {
      this.httpClient.logger = logger
    }
    // API client's HTTP client
    if (this.apiClient?.instance?.httpClient) {
      this.apiClient.instance.httpClient.logger = logger
    }
    // Gateway client's HTTP client
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
    this.apiClient = new ApiClient(this)
    this.liveClient = new LiveClient(this)
    this.gatewayClient = new GatewayClient(this)
    this.stickerClient = new StickerClient(this)
    await this.stickerClient.initSticker()
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
    return true
  }
}
