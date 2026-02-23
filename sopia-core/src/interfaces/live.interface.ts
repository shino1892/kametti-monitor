import type { LiveCategory } from '../const/category.const'

export interface PageRequestOptions {
  page_size?: number
  page?: number
}

export interface PopularRequestOptions extends PageRequestOptions {
  category?: LiveCategory
}

export interface CreateLiveOptions {
  is_access_ghost_user: boolean
  is_adult: boolean
  is_save: boolean
  donation: number
  title: string
  type: number
  welcome_message: string
  invite_member_ids: number[]
  tags: string[]
  categories: LiveCategory[]
  engine: {
    name: 'sing' | 'sori'
    host: string
  }
  is_live_call: boolean
  is_live_call_donation: boolean
  device_unique_id: string
  allow_donations: string[]
  spoon_aim: Array<{
    title: string
    count: number
  }>
  img_key?: string
}

/**
 * 방송 정보 업데이트 옵션
 * PUT /lives/{liveId}/
 */
export interface UpdateLiveOptions {
  is_adult?: boolean
  is_save?: boolean
  donation?: number
  title?: string
  type?: number
  welcome_message?: string
  invite_member_ids?: number[]
  tags?: string[]
  categories?: LiveCategory[]
  engine?: {
    name: 'sing' | 'sori'
    host: string
  }
  is_live_call?: boolean
  device_unique_id?: string
  allow_donations?: string[]
  is_access_ghost_user?: boolean
  is_live_call_donation?: boolean
  img_key?: string
  spoon_aim?: Array<{
    title: string
    count: number
  }>
}
