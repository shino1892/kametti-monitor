export class UserBudget {
  present_spoon!: number
  purchase_spoon!: number
  total_exchange_spoon!: number
  monthly_pay_amount!: number
}

export class UserGrants {
  login!: number
  cast!: number
  talk!: number
  live!: number
  adult!: number
  auth!: number
  phone!: number
  payment!: number
}

export class UserPushSettings {
  bj!: boolean
  follow!: boolean
  like_or_present!: boolean
  comment_or_mention_cast!: boolean
  comment_or_mention_talk!: boolean
  comment_or_mention_board!: boolean
  event_or_marketing!: boolean
  subscription_dj!: boolean
  directmessage!: boolean
  buzz_post_liked!: boolean
  buzz_post_commented!: boolean
  buzz_comment_liked!: boolean
  buzz_related_added!: boolean
  my_channel!: boolean
  my_payment!: boolean
  voice_card_received!: boolean
  voice_card_reply_message!: boolean
  voice_card_reply_like!: boolean
  voice_card_reply_sticker!: boolean
}

export class UserServiceAgreement {
  service_terms!: boolean
  personal_info_col!: boolean
  personal_info_exp!: boolean
  device_access!: boolean
  marketing!: boolean
  voice_info_exp!: boolean | null
  birth_gender_nickname_col!: boolean
  over_fourteen_col!: boolean
  legal_representative_info_col!: boolean | null
  legal_rep_payment_col!: boolean | null
  privacy_policy_col!: boolean | null
  pay_agree_for_minors!: boolean | null
  marketing_email!: boolean | null
  night_push_agree!: boolean | null
}

export class UserCurrentLive {
  id!: number
  is_live!: boolean
}

export class User {
  id!: number
  nickname!: string
  tag!: string
  sns_type!: string
  description!: string
  profile_url!: string
  date_joined!: string
  follower_count!: number
  following_count!: number
  token!: string
  budget!: UserBudget
  grants!: UserGrants
  push_settings!: UserPushSettings
  is_active!: boolean
  is_exist!: boolean
  is_staff!: boolean
  result_code!: number
  result_message!: string
  is_choice!: boolean
  tier!: string | null
  is_vip!: boolean
  country!: string
  service_agreement!: UserServiceAgreement
  gender!: number
  date_of_birth!: string
  is_password_notice!: boolean
  is_verified!: boolean
  is_dj!: boolean
  email!: string
  badge_style_ids!: number[]
  vip_grade!: string | null
  profile_cover_url!: string
  referring_target_user_id!: number | null
  referring_user_id!: number | null
  location!: string | null
  refresh_token!: string
  current_live!: UserCurrentLive
  current_live_id!: number

  // custom item
  is_manager!: boolean
}

export class UserMemberProfile {
  id!: number
  nickname!: string
  tag!: string
  top_impressions!: string[]
  description!: string
  profile_url!: string
  gender!: number
  follow_status!: number
  follower_count!: number
  following_count!: number
  is_active!: boolean
  is_staff!: boolean
  is_vip!: boolean
  date_joined!: string
  current_live!: UserCurrentLive
  country!: string
  tier!: string | null
  is_verified!: boolean
  self_introduction!: string
  is_award_user!: boolean
  profile_cover_url!: string
  badge_style_ids!: number[]
  vip_grade!: string | null
  favorite_temperature!: number
  is_high_temperature!: boolean
  profile_ring!: string | null
  subscriber_count!: number | null
  live_dj_rank!: number | null
  like_dj_rank!: number | null
  top_fan_rank!: number
  subscription_continuous_count!: number | null
  dj_follow_status!: number
}

/**
 * 청취자 목록 API 응답 (/lives/{liveId}/listeners/)
 */
export class LiveListener {
  id!: number
  nickname!: string
  tag!: string
  top_impressions!: string[]
  description!: string
  profile_url!: string
  gender!: number
  follow_status!: number
  follower_count!: number
  following_count!: number
  is_active!: boolean
  is_staff!: boolean
  is_vip!: boolean
  vip_grade!: string | null
  date_joined!: string
  current_live!: UserCurrentLive | null
  country!: string
  is_verified!: boolean
  favorite_temperature!: number
  is_high_temperature!: boolean
  regular_score!: number
}

/**
 * 실시간 랭킹/누적 랭킹 팬 정보 (/lives/{liveId}/sponsor-rank/, /lives/{liveId}/listeners/fans/)
 */
export class LiveFan {
  id!: number
  nickname!: string
  tag!: string
  top_impressions!: string[]
  description!: string
  profile_url!: string
  gender!: number
  follow_status!: number
  follower_count!: number
  following_count!: number
  is_active!: boolean
  is_staff!: boolean
  is_vip!: boolean
  date_joined!: string
  current_live!: UserCurrentLive | null
  country!: string
  is_verified!: boolean
  spoon_count!: number // DJ일 때만 값 존재
}

/**
 * 랭킹 응답 래퍼 (sponsor-rank, fans)
 */
export class LiveFanRanking {
  total_count!: number
  fans!: LiveFan[]
}

/**
 * 좋아요 랭킹 사용자 (/lives/{liveId}/like/)
 */
export class LiveLikeUser {
  id!: number
  nickname!: string
  is_vip!: boolean
  profile_url!: string
  like_count!: number | null // DJ일 때만 값 존재
}

/**
 * 사용자 메타 정보 (/users/meta/)
 */
export class UserMeta {
  id!: number
  nickname!: string
  profile_url!: string
  is_verified!: boolean
  status!: number
  tag!: string
  is_staff!: boolean
  vip_grade!: string
  badge_style_ids!: number[]
}
