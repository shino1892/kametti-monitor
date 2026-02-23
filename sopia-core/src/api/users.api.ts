import type { ApiHttpClient } from '../client/http.client'
import type { Spoon } from '../client/spoon.client'
import { ApiError, type ApiResponse } from '../struct/response.struct'
import { User, UserCurrentLive, UserMeta } from '../struct/user.struct'

export class UserApi {
  constructor(
    private http: ApiHttpClient,
    private spoon: Spoon
  ) {}

  async getUserInfo(id: number): Promise<User> {
    const res = await this.http.request(`/users/${id}`, { method: 'GET' }, User)
    if (res instanceof ApiError) {
      throw res
    }
    return res.results[0]
  }

  async getFollowings(id: number, nickname?: string): Promise<ApiResponse<User>> {
    const res = await this.http.request(
      `/users/${id}/followings`,
      {
        method: 'GET',
        params: {
          ...(nickname ? { nickname } : {})
        }
      },
      User
    )
    if (res instanceof ApiError) {
      throw res
    }
    return res
  }

  async getFollowers(id: number, nickname?: string): Promise<ApiResponse<User>> {
    const res = await this.http.request(
      `/users/${id}/followers`,
      {
        method: 'GET',
        params: {
          ...(nickname ? { nickname } : {})
        }
      },
      User
    )
    if (res instanceof ApiError) {
      throw res
    }
    return res
  }

  async getCurrentLive(id: number): Promise<UserCurrentLive> {
    const res = await this.http.request(`/users/${id}/live`, { method: 'GET' }, UserCurrentLive)
    if (res instanceof ApiError) {
      throw res
    }
    return res.results[0]
  }

  /**
   * 여러 사용자의 메타 정보 조회
   * @param userIds 사용자 ID 배열
   * @param includeCurrentLive 현재 방송 정보 포함 여부
   */
  async getUsersMeta(userIds: number[], includeCurrentLive = false): Promise<UserMeta[]> {
    if (userIds.length === 0) return []
    const res = await this.http.request(
      `/users/meta/`,
      {
        method: 'GET',
        params: {
          user_ids: userIds.join(','),
          include_current_live: String(includeCurrentLive)
        }
      },
      UserMeta
    )
    if (res instanceof ApiError) {
      throw res
    }
    return res.results
  }
}
