/**
 * 채널(프로필) 관련 타입 정의
 * Gateway API: GET /channels/{userId}
 */

import { Type } from 'class-transformer'

/**
 * DJ 멤버십 정보
 */
export class ChannelMembershipDj {
  id!: number
  nickname!: string
  tag!: string
  profileUrl!: string
}

/**
 * 채널 멤버십 정보
 */
export class ChannelMembership {
  @Type(() => ChannelMembershipDj)
  dj!: ChannelMembershipDj

  grade!: string
  status!: string
  castId!: number | null
  imageUrl!: string | null
  colorCode!: number
  description!: string | null
  maxPlanLevel!: number
  planLevels!: number[]
  userPlanLevel!: number | null
  signatureCast!: unknown | null
}

/**
 * 프로필 링 컬렉션
 */
export class ProfileRingCollection {
  isPublic!: boolean
  profileRingSummary!: unknown | null
  newProfileRingSummary!: unknown | null
}

/**
 * 채널 정보
 */
export class Channel {
  id!: number
  nickname!: string
  profileUrl!: string
  profileCoverUrl!: string
  selfIntroduction!: string
  description!: string
  fanNotice!: string
  tag!: string
  followerCount!: number
  subscriberCount!: number

  /** 팔로우 상태: 0=미팔로우, 1=팔로우, 3=맞팔로우 */
  followStatus!: number

  badgeList!: unknown[]
  tier!: string | null

  @Type(() => ChannelMembership)
  membership!: ChannelMembership | null

  profileRing!: unknown | null

  @Type(() => ProfileRingCollection)
  profileRingCollection!: ProfileRingCollection

  currentLiveId!: number | null
  isVerified!: boolean
  isStaff!: boolean
  vipGrade!: string | null
  hasVoiceInfo!: boolean | null
  referralCode!: string | null
  isFollowingPush!: boolean
}

/**
 * 최근 포스트 콘텐츠 데이터
 */
export class RecentPostContentData {
  id!: number
  authorId!: number
  contents!: string
  media!: string[]
  likeCount!: number
  commentCount!: number
}

/**
 * 최근 포스트
 */
export class RecentPost {
  id!: string

  @Type(() => RecentPostContentData)
  contentData!: RecentPostContentData

  contentType!: string
  type!: string
  visibleOption!: string
  isPin!: boolean
  contentSource!: string
  likeStatus!: boolean
  plan!: unknown | null
  created!: string
}

/**
 * 탑 팬 정보
 */
export class TopFan {
  id!: number
  nickname!: string
  profileUrl!: string
  userPlanLevel!: number | null
  totalSpoonCount!: number | null
}

/**
 * 채널 응답 결과
 */
export class ChannelResult {
  @Type(() => Channel)
  channel!: Channel

  analysis!: unknown | null
  schedules!: unknown[]

  @Type(() => TopFan)
  topFans!: TopFan[]

  popularCasts!: unknown[]
  recentLiveCasts!: unknown[]

  @Type(() => RecentPost)
  recentPosts!: RecentPost[]

  socialLinks!: unknown[]
}

/**
 * 채널 API 응답
 * GET /channels/{userId}
 */
export class ChannelResponse {
  statusCode!: number

  @Type(() => ChannelResult)
  result!: ChannelResult
}
