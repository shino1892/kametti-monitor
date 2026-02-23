import type { ApiHttpClient } from '../client/http.client'
import type { Spoon } from '../client/spoon.client'
import type {
  CreateLiveOptions,
  PageRequestOptions,
  PopularRequestOptions
} from '../interfaces/live.interface'
import { ContentInfo } from '../struct/info.struct'
import { Live, LiveToken, LiveUrl, SoriPublish, LiveCheckResult } from '../struct/live.struct'
import { ApiError, type ApiResponse, HttpResponse } from '../struct/response.struct'
import type { InventoryItem } from '../struct/store.struct'
import {
  User,
  UserMemberProfile,
  LiveListener,
  LiveFanRanking,
  LiveLikeUser
} from '../struct/user.struct'

export class LiveApi {
  constructor(
    private http: ApiHttpClient,
    private spoon: Spoon
  ) {}

  async getBanner(): Promise<ApiResponse<ContentInfo>> {
    const res = await this.http.request('/lives/banner/', { method: 'GET' }, ContentInfo)
    if (res instanceof ApiError) {
      throw res
    }
    return res
  }

  async getPopular(options: PopularRequestOptions): Promise<ApiResponse<Live>> {
    const res = await this.http.request(
      '/lives/popular/',
      {
        method: 'GET',
        params: options
      },
      Live
    )
    if (res instanceof ApiError) {
      throw res
    }
    return res
  }

  async getSubscribed(options: PageRequestOptions): Promise<ApiResponse<Live>> {
    const res = await this.http.request(
      '/lives/subscribed/',
      {
        method: 'GET',
        params: options
      },
      Live
    )
    if (res instanceof ApiError) {
      throw res
    }
    return res
  }

  async getInfo(id: number): Promise<Live> {
    const res = await this.http.request(`/lives/${id}/`, { method: 'GET' }, Live)
    if (res instanceof ApiError) {
      throw res
    }
    return res.results[0]
  }

  async getLiveToken(id: number): Promise<LiveToken> {
    const res = await this.http.request(
      `/lives/${id}/token/`,
      {
        method: 'POST',
        body: {
          device_unique_id: this.spoon.deviceUniqueId
        }
      },
      LiveToken
    )
    if (res instanceof ApiError) {
      throw res
    }
    return res.results[0]
  }

  async createLive(options: CreateLiveOptions): Promise<Live> {
    const res = await this.http.request('/lives/', { method: 'POST', body: options }, Live)
    if (res instanceof ApiError) {
      throw res
    }
    return res.results[0]
  }

  soriPublish(live: Live, protocol: 'srt' | 'rtmp' = 'srt') {
    return this.http.httpClient.request(
      `http://${live.host_address}:5021/sori/4/publish/${live.stream_name}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.spoon.token || this.spoon.logonUser.token}`,
          'x-live-authorization': live.jwt
        },
        body: JSON.stringify({
          media: {
            type: 'audio',
            protocol,
            format: 'aac'
          },
          reason: {
            code: 50000,
            message: 'unknown'
          },
          props: {
            country: this.spoon.country,
            stage: 'prod',
            live_id: live.id.toString(),
            user_id: this.spoon.logonUser.id.toString(),
            user_tag: this.spoon.logonUser.tag,
            platform: 'SOPIA',
            os: 'windows'
          }
        })
      },
      SoriPublish
    )
  }

  async getLiveUrl(): Promise<LiveUrl> {
    const res = await this.http.request('/commons/live/url/', { method: 'GET' }, LiveUrl)
    if (res instanceof ApiError) {
      throw res
    }
    return res.results[0]
  }

  async close(live: Live, isSave = false): Promise<void> {
    const res = await this.http.request(
      `/lives/${live.id}/close/`,
      {
        method: 'POST',
        body: {
          is_save: isSave
        }
      },
      HttpResponse
    )
    if (res instanceof ApiError) {
      throw res
    }
  }

  async useItem(live: Live, item: InventoryItem, combo = 1, target_id?: number): Promise<void> {
    const res = await this.http.request(
      `/lives/${live.id}/item/${item.id}/`,
      {
        method: 'POST',
        headers: {
          'x-live-authorization': `Bearer ${live.jwt}`
        },
        body: {
          combo,
          ...(target_id ? { target_id } : {})
        }
      },
      HttpResponse
    )
    if (res instanceof ApiError) {
      throw res
    }
  }

  async getMemberProfile(live: Live, user: User): Promise<UserMemberProfile> {
    const res = await this.http.request(
      `/lives/${live.id}/member/${user.id}/profile/`,
      { method: 'GET' },
      UserMemberProfile
    )
    if (res instanceof ApiError) {
      throw res
    }
    return res.results[0]
  }

  async block(live: Live, user: User): Promise<ApiResponse<User>> {
    const res = await this.http.request(
      `/lives/${live.id}/block/`,
      {
        method: 'POST',
        body: {
          block_user_id: user.id
        }
      },
      User
    )
    if (res instanceof ApiError) {
      throw res
    }
    return res
  }

  async setManagerList(live: Live, user: User[] = []): Promise<ApiResponse<User>> {
    const res = await this.http.request(
      `/lives/${live.id}/manager/`,
      {
        method: 'POST',
        body: {
          manager_ids: user.map((u) => u.id)
        }
      },
      User
    )
    if (res instanceof ApiError) {
      throw res
    }
    return res
  }

  async updateLive(live: Live): Promise<Live> {
    const res = await this.http.request(`/lives/${live.id}/`, { method: 'PUT', body: live }, Live)
    if (res instanceof ApiError) {
      throw res
    }
    return res.results[0]
  }

  /**
   * 청취자 목록 조회
   * GET /lives/{liveId}/listeners/
   */
  async getListeners(liveId: number, next?: string): Promise<ApiResponse<LiveListener>> {
    const url = next || `/lives/${liveId}/listeners/`
    const res = await this.http.request(url, { method: 'GET' }, LiveListener)
    if (res instanceof ApiError) {
      throw res
    }
    return res
  }

  /**
   * 실시간 스푼 후원 랭킹 조회
   * GET /lives/{liveId}/sponsor-rank/
   */
  async getSponsorRank(liveId: number, next?: string): Promise<ApiResponse<LiveFanRanking>> {
    const url = next || `/lives/${liveId}/sponsor-rank/`
    const res = await this.http.request(url, { method: 'GET' }, LiveFanRanking)
    if (res instanceof ApiError) {
      throw res
    }
    return res
  }

  /**
   * 누적 후원 랭킹 조회
   * GET /lives/{liveId}/listeners/fans/
   */
  async getCumulativeRank(liveId: number, next?: string): Promise<ApiResponse<LiveFanRanking>> {
    const url = next || `/lives/${liveId}/listeners/fans/`
    const res = await this.http.request(url, { method: 'GET' }, LiveFanRanking)
    if (res instanceof ApiError) {
      throw res
    }
    return res
  }

  /**
   * 좋아요 랭킹 조회
   * GET /lives/{liveId}/like/
   */
  async getLikeRank(liveId: number, next?: string): Promise<ApiResponse<LiveLikeUser>> {
    const url = next || `/lives/${liveId}/like/`
    const res = await this.http.request(url, { method: 'GET' }, LiveLikeUser)
    if (res instanceof ApiError) {
      throw res
    }
    return res
  }

  /**
   * 비정상 종료 방송 체크
   * GET /lives/{userId}/check/
   *
   * @param userId - 로그인한 사용자의 ID (loginSpoonId)
   * @returns 방송 상태 정보 배열
   *   - status -2: 비정상 종료
   *   - status 1: 진행중
   *   - status 2: 정상 종료
   */
  async check(userId: number): Promise<ApiResponse<LiveCheckResult>> {
    const res = await this.http.request(
      `/lives/${userId}/check/`,
      { method: 'GET' },
      LiveCheckResult
    )
    if (res instanceof ApiError) {
      throw res
    }
    return res
  }
}
