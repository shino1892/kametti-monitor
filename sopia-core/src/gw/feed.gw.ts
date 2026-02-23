import type { ApiHttpClient } from '../client/http.client'
import type { FeedOptions } from '../struct/feed.struct'
import { FeedResponse, PostDetail, CommentsResponse, RepliesResponse } from '../struct/feed.struct'

/**
 * 피드(포스트/톡) Gateway API
 * Base URL: {region}-gw.spooncast.net
 */
export class FeedGateway {
  constructor(private http: ApiHttpClient) {}

  /**
   * DJ 피드 목록 조회
   * @param userId DJ 사용자 ID
   * @param options 조회 옵션
   */
  getFeed(userId: number, options: FeedOptions = {}) {
    const params = new URLSearchParams({
      contentType: options.contentType || 'POST',
      isNext: String(options.isNext || false),
      ...(options.excludeContentType && { excludeContentType: options.excludeContentType }),
      ...(options.offset && { offset: options.offset })
    })

    return this.http.request(`/feed/${userId}/DJ?${params}`, { method: 'GET' }, FeedResponse)
  }

  /**
   * 팬보드 피드 목록 조회 (팬들이 DJ에게 남긴 글)
   * @param userId DJ 사용자 ID
   * @param options 조회 옵션
   */
  getFanFeed(userId: number, options: FeedOptions = {}) {
    const params = new URLSearchParams({
      contentType: options.contentType || 'POST',
      isNext: String(options.isNext || false),
      ...(options.excludeContentType && { excludeContentType: options.excludeContentType }),
      ...(options.offset && { offset: options.offset })
    })

    return this.http.request(`/feed/${userId}/FAN?${params}`, { method: 'GET' }, FeedResponse)
  }

  /**
   * 포스트 좋아요
   * @param postId 포스트 ID
   */
  likePost(postId: number) {
    return this.http.request(`/posts/${postId}/like`, { method: 'POST' })
  }

  /**
   * 포스트 좋아요 취소
   * @param postId 포스트 ID
   */
  unlikePost(postId: number) {
    return this.http.request(`/posts/${postId}/like`, { method: 'DELETE' })
  }

  /**
   * 포스트 상세 조회
   * @param postId 포스트 ID
   */
  getPost(postId: number) {
    return this.http.request(`/posts/${postId}`, { method: 'GET' }, PostDetail)
  }

  /**
   * 포스트 댓글 목록 조회
   * @param postId 포스트 ID
   */
  async getComments(postId: number) {
    const response = await this.http.request(`/posts/${postId}/comments`, { method: 'GET' }, CommentsResponse)
    if (response.status_code !== 200 || !('results' in response)) {
      return []
    }
    return response.results?.[0]?.comments ?? []
  }

  /**
   * 댓글 답글 목록 조회
   * @param postId 포스트 ID
   * @param commentId 댓글 ID
   */
  async getReplies(postId: number, commentId: number) {
    const response = await this.http.request(`/posts/${postId}/comments/${commentId}/replies`, { method: 'GET' }, RepliesResponse)
    if (response.status_code !== 200 || !('results' in response)) {
      return []
    }
    return response.results?.[0]?.comments ?? []
  }

  /**
   * 댓글 작성
   * @param postId 포스트 ID
   * @param contents 댓글 내용
   */
  createComment(postId: number, contents: string) {
    return this.http.request(`/posts/${postId}/comments`, {
      method: 'POST',
      body: { contents }
    })
  }

  /**
   * 답글 작성
   * @param postId 포스트 ID
   * @param commentId 댓글 ID
   * @param contents 답글 내용
   */
  createReply(postId: number, commentId: number, contents: string) {
    return this.http.request(`/posts/${postId}/comments/${commentId}/replies`, {
      method: 'POST',
      body: { contents }
    })
  }

  /**
   * 포스트/팬보드 작성
   * @param options 포스트 작성 옵션
   */
  createPost(options: CreatePostOptions) {
    return this.http.request('/posts', {
      method: 'POST',
      body: {
        type: options.type,
        targetUserId: options.targetUserId,
        contents: options.contents,
        visibleOption: options.visibleOption || 'ALL'
      }
    }, PostDetail)
  }
}

/**
 * 포스트 작성 옵션
 */
export interface CreatePostOptions {
  /** 포스트 타입: DJ(본인 포스트) 또는 FAN(팬보드) */
  type: 'DJ' | 'FAN'
  /** 대상 사용자 ID */
  targetUserId: number
  /** 포스트 내용 */
  contents: string
  /** 공개 범위 (기본값: ALL) */
  visibleOption?: 'ALL' | 'ONLYME' | 'ONLYFAN'
}
