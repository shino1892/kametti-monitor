import type { Tier } from '../interfaces/tier.interface'
import { ContentInfo } from './info.struct'
import type { User } from './user.struct'

export class LiveCall {
  guests!: User[]
  version!: number
}

export class Live extends ContentInfo {
  badge_style_ids!: number[]
  broadcast_extension_count!: number
  access_key!: string
  categories!: string[]
  engine_name!: string
  is_adult!: boolean
  is_editors!: boolean
  is_live_call!: boolean
  is_live_call_donation!: boolean
  is_verified!: boolean
  is_vip!: boolean
  is_access_ghost_user!: boolean
  is_virtual!: boolean
  is_like!: boolean
  is_freeze!: boolean
  is_mute!: boolean
  is_beginner!: boolean
  is_call!: boolean
  is_save!: boolean
  is_join_now!: boolean
  live_call!: LiveCall
  member_count!: number
  os_type!: any // unknown type
  room_token!: string
  spoon_aim!: Array<{ title: string; count: number }>
  jwt!: string
  tier!: Tier
  total_member_count!: number
  total_spoon_count!: number
  host_address!: string
  welcome_message!: string
  top_fans!: { user: User }[]
  url!: string
  url_hls!: string
  stream_name!: string
  manager_ids!: number[]
  protocol!: string
  msg_interval!: number
  donation!: number
  close_air_time!: string
  closed!: boolean
  close_status!: number
  hashtags!: string[]
  status!: number
  sv!: string
  system!: {
    protocol: string
    server: string
  }
}

export class SoriPublish {
  publish!: {
    name: string
    control: string
    transports: Array<{
      type: string
      address: string
      port: number
    }>
    media: {
      type: string
      protocol: string
      format: string
    }
    rtmp: {
      url: string
      name: string
    }
  }
}

export class LiveToken {
  items!: any[]
  jwt!: string
}

export class LiveUrl {
  voice!: {
    url: string
    key: string
    content_type: string
  }

  image!: {
    url: string
    key: string
    content_type: string
  }
}

/**
 * 비정상 종료 체크 API 응답
 * GET /lives/{userId}/check/
 *
 * status:
 *   -2: 비정상 종료
 *   1: 진행중
 *   2: 정상 종료
 */
export class LiveCheckResult {
  status!: number
  now!: string
  engine_name!: string
  is_live_call!: boolean
  close_air_time!: string
  created!: string
  closed!: string
}
