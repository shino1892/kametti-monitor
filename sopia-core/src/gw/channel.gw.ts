import type { ApiHttpClient } from '../client/http.client'
import { ChannelResponse } from '../struct/channel.struct'

/**
 * 채널(프로필) Gateway API
 * Base URL: {region}-gw.spooncast.net
 */
export class ChannelGateway {
  constructor(private http: ApiHttpClient) {}

  /**
   * 채널 정보 조회
   * @param userId 사용자 ID
   */
  getChannel(userId: number) {
    return this.http.request(`/channels/${userId}`, { method: 'GET' }, ChannelResponse)
  }

  /**
   * 팔로우 하기
   * @param userId 팔로우할 사용자 ID
   */
  follow(userId: number) {
    return this.http.request(`/users/${userId}/follow`, { method: 'POST' })
  }

  /**
   * 언팔로우 하기
   * @param userId 언팔로우할 사용자 ID
   */
  unfollow(userId: number) {
    return this.http.request(`/users/${userId}/follow`, { method: 'DELETE' })
  }
}
