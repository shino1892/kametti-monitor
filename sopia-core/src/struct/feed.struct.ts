/**
 * 피드(포스트/톡) 관련 타입 정의
 * Gateway API: GET /feed/{userId}/DJ
 */

import { Type } from 'class-transformer'

/**
 * 피드 콘텐츠 데이터
 * FeedItem.contentData 에 해당
 */
export class FeedContentData {
  /** 포스트 숫자 ID */
  id!: number

  /** 작성자 ID */
  authorId!: number

  /** 포스트 본문 내용 */
  contents!: string

  /** 첨부 이미지 URL 배열 */
  media!: string[]

  /** 좋아요 수 */
  likeCount!: number

  /** 댓글 수 */
  commentCount!: number
}

/**
 * 구독 플랜 정보
 */
export class FeedPlanInfo {
  level!: number
  name!: string
}

/**
 * 포스트/톡/캐스트 피드 아이템
 * GET /feed/{userId}/DJ 응답의 results 배열 항목
 */
export class FeedItem {
  /** 포스트 고유 ID (문자열, 예: "020017537829") */
  id!: string

  /** 콘텐츠 타입 */
  contentType!: 'POST' | 'TALK' | 'CAST'

  /** 사용자 타입 */
  type!: 'DJ' | 'FAN'

  /** 생성 시간 (ISO 8601) */
  created!: string

  /** 공개 범위 */
  visibleOption!: 'ALL' | 'ONLYME' | 'ONLYFAN' | 'SUBSCRIBE_LV10' | 'SUBSCRIBE_LV20' | 'SUBSCRIBE_LV30'

  /** 고정 여부 */
  isPin!: boolean

  /** 콘텐츠 출처 */
  contentSource!: 'GENERAL' | 'LIVE' | 'CAST'

  /** 좋아요 여부 (로그인 시) */
  likeStatus!: boolean

  /** 구독 플랜 정보 (구독자 전용 콘텐츠용) */
  plan!: FeedPlanInfo | null

  /** 실제 포스트 데이터 */
  @Type(() => FeedContentData)
  contentData!: FeedContentData
}

/**
 * 피드 목록 응답
 * GET /feed/{userId}/DJ 응답
 */
export class FeedResponse {
  /** DJ의 사용자 ID */
  userId!: number

  /** 포스트 배열 */
  @Type(() => FeedItem)
  results!: FeedItem[]

  /** 다음 페이지 오프셋 */
  offset!: string
}

/**
 * 피드 조회 옵션
 */
export interface FeedOptions {
  contentType?: 'POST' | 'TALK' | 'CAST'
  excludeContentType?: string
  isNext?: boolean
  offset?: string
}

/**
 * 포스트 상세 정보
 * GET /posts/{postId} 응답
 */
export class PostDetail {
  id!: number
  targetUserId!: number
  userId!: number
  contents!: string
  visibleOption!: string
  type!: string
  likeCount!: number
  commentCount!: number
  updated!: string
  created!: string
  media!: string[]
  likeStatus!: boolean
  plan!: FeedPlanInfo | null
}

/**
 * 댓글 작성자 정보
 */
export class CommentAuthor {
  id!: number
  nickname!: string
  profileUrl!: string | null
  tag!: string
}

/**
 * 댓글 정보
 * GET /posts/{postId}/comments 응답 배열 항목
 */
export class PostComment {
  commentId!: number
  userId!: number
  contents!: string
  created!: string
  replyCount!: number
  likeCount!: number
  likeStatus!: boolean

  @Type(() => CommentAuthor)
  author!: CommentAuthor

  /** id getter for compatibility */
  get id(): number {
    return this.commentId
  }
}

/**
 * 댓글 목록 응답
 * GET /posts/{postId}/comments 응답
 */
export class CommentsResponse {
  postId!: number

  @Type(() => PostComment)
  comments!: PostComment[]
}

/**
 * 답글 정보
 * GET /posts/{postId}/comments/{commentId}/replies 응답 배열 항목
 */
/**
 * 답글 목록 응답
 * GET /posts/{postId}/comments/{commentId}/replies 응답
 * 참고: 답글도 comments 배열로 반환되며 commentId 필드를 사용함
 */
export class RepliesResponse {
  postId!: number

  @Type(() => PostComment)
  comments!: PostComment[]
}
