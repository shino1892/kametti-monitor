/**
 * SOPIA Extension API Types
 *
 * 확장앱 개발을 위한 타입 정의입니다.
 * Worker(index.js)와 Renderer(설정 페이지) 모두에서 사용할 수 있습니다.
 *
 * @example Worker (TypeScript)
 * ```typescript
 * // tsconfig.json에서 @sopia-bot/core 타입 참조
 * // 또는 sopia.d.ts 파일에서 import
 *
 * sopia.live.on('ChatMessage', (data: ChatMessagePayload) => {
 *   console.log(data.generator.nickname, data.message)
 * })
 * ```
 *
 * @example Renderer (React)
 * ```typescript
 * import type { ChatMessagePayload } from '@sopia-bot/core/extension'
 *
 * useSopiaEvent<ChatMessagePayload>('chat:message', (data) => {
 *   // data is typed
 * })
 * ```
 */

// ============================================
// Re-export v2 Live Event Types
// ============================================

export type {
  UserInfo,
  RoomJoinPayload,
  ChatMessagePayload,
  RoomKickPayload,
  LiveMetaUpdatePayload,
  LiveDonationPayload,
  LiveFreeLikePayload,
  LivePaidLikePayload,
  LiveItemUsePayload,
  LiveRankPayload,
  AnyEventPayload,
  MessagePayload,
  EventBody
} from '../struct/v2/socket.struct'

export { EventName, type EventNameType } from '../const/v2/socket.const'

// ============================================
// Extension-specific Types
// ============================================

/**
 * Live 이벤트 이름
 */
export type LiveEventName =
  | 'ChatMessage'
  | 'RoomJoin'
  | 'RoomKick'
  | 'LiveMetaUpdate'
  | 'LiveDonation'
  | 'LiveFreeLike'
  | 'LivePaidLike'
  | 'LiveItemUse'
  | 'LiveRank'

/**
 * Live 이벤트 데이터 매핑
 */
import type {
  RoomJoinPayload,
  ChatMessagePayload,
  RoomKickPayload,
  LiveMetaUpdatePayload,
  LiveDonationPayload,
  LiveFreeLikePayload,
  LivePaidLikePayload,
  LiveItemUsePayload,
  LiveRankPayload
} from '../struct/v2/socket.struct'

export type LiveEventPayload<T extends LiveEventName> =
  T extends 'ChatMessage' ? ChatMessagePayload :
  T extends 'RoomJoin' ? RoomJoinPayload :
  T extends 'RoomKick' ? RoomKickPayload :
  T extends 'LiveMetaUpdate' ? LiveMetaUpdatePayload :
  T extends 'LiveDonation' ? LiveDonationPayload :
  T extends 'LiveFreeLike' ? LiveFreeLikePayload :
  T extends 'LivePaidLike' ? LivePaidLikePayload :
  T extends 'LiveItemUse' ? LiveItemUsePayload :
  T extends 'LiveRank' ? LiveRankPayload :
  never

// ============================================
// Live Info (현재 방송 정보)
// ============================================

/**
 * 현재 라이브 방송 정보
 */
export interface LiveInfo {
  id: number
  title: string
  memberCount: number
  likeCount: number
  spoonCount: number
  isLive: boolean
  streamStatus: 'PLAY' | 'PAUSE' | string
  dj: {
    id: number
    nickname: string
    profileUrl?: string
  }
}

// ============================================
// SOPIA API Interfaces
// ============================================

/**
 * 유저 API (read:users 권한 필요)
 */
export interface SopiaUserAPI {
  /**
   * 유저 정보 조회
   * @param userId 유저 ID
   */
  getInfo(userId: number): Promise<import('../struct/v2/socket.struct').UserInfo | null>

  /**
   * 유저 검색
   * @param keyword 검색어
   */
  search(keyword: string): Promise<import('../struct/v2/socket.struct').UserInfo[]>
}

/**
 * 라이브 API (read:lives 권한 필요)
 */
export interface SopiaLiveAPI {
  /**
   * 현재 라이브 정보 조회
   */
  getInfo(): Promise<LiveInfo>

  /**
   * 라이브 이벤트 리스너 등록
   * @param event 이벤트 이름
   * @param handler 이벤트 핸들러
   */
  on<T extends LiveEventName>(
    event: T,
    handler: (data: LiveEventPayload<T>) => void
  ): void

  /**
   * 라이브 이벤트 리스너 제거
   * @param event 이벤트 이름
   * @param handler 제거할 핸들러
   */
  off<T extends LiveEventName>(
    event: T,
    handler: (data: LiveEventPayload<T>) => void
  ): void
}

/**
 * 채팅 API (write:lives 권한 필요)
 */
export interface SopiaChatAPI {
  /**
   * 채팅 메시지 전송
   * @param message 메시지 내용
   */
  send(message: string): Promise<void>

  /**
   * 좋아요 전송
   */
  sendLike(): Promise<void>
}

/**
 * 팔로우 API (write:users 권한 필요)
 */
export interface SopiaFollowAPI {
  /**
   * 유저 팔로우
   * @param userId 팔로우할 유저 ID
   */
  follow(userId: number): Promise<void>

  /**
   * 유저 언팔로우
   * @param userId 언팔로우할 유저 ID
   */
  unfollow(userId: number): Promise<void>
}

/**
 * SECRET API (항상 사용 가능)
 *
 * 확장앱의 비밀 환경변수를 서버에서 조회합니다.
 * 각 확장앱은 자신의 SECRET만 조회할 수 있습니다.
 */
export interface SopiaSecretAPI {
  /**
   * SECRET 값 조회
   * @param key SECRET 키 이름
   * @returns SECRET 값 또는 null (존재하지 않는 경우)
   */
  get(key: string): Promise<string | null>
}

/**
 * SQLite 실행 결과
 */
export interface SqliteRunResult {
  /** 영향받은 행 수 */
  changes: number
  /** 마지막 INSERT의 rowid */
  lastInsertRowid: number | bigint
}

/**
 * SQLite 데이터베이스 API (sqlite 권한 필요)
 *
 * 데이터는 확장앱 폴더의 storage.db 파일에 저장됩니다.
 * 마이그레이션은 db/ 폴더의 SQL 파일로 관리됩니다.
 */
export interface SopiaSqliteAPI {
  /**
   * INSERT, UPDATE, DELETE 실행
   * @param sql SQL 문
   * @param params 바인딩 파라미터
   * @returns 영향받은 행 수와 lastInsertRowid
   */
  run(sql: string, params?: unknown[]): Promise<SqliteRunResult>

  /**
   * SELECT 단일 행 조회
   * @param sql SQL 문
   * @param params 바인딩 파라미터
   * @returns 첫 번째 행 또는 undefined
   */
  get<T = unknown>(sql: string, params?: unknown[]): Promise<T | undefined>

  /**
   * SELECT 여러 행 조회
   * @param sql SQL 문
   * @param params 바인딩 파라미터
   * @returns 모든 행 배열
   */
  all<T = unknown>(sql: string, params?: unknown[]): Promise<T[]>

  /**
   * 여러 SQL 문 실행 (DDL용)
   * @param sql 세미콜론으로 구분된 SQL 문들
   */
  exec(sql: string): Promise<void>
}

/**
 * Worker ↔ Renderer 통신 API (항상 사용 가능)
 */
export interface SopiaWebAPI {
  /**
   * Renderer로 이벤트 전송
   * @param event 이벤트 이름
   * @param args 전달할 데이터
   */
  emit(event: string, ...args: unknown[]): void

  /**
   * Renderer에서 오는 이벤트 수신
   * @param event 이벤트 이름
   * @param handler 이벤트 핸들러
   */
  on(event: string, handler: (...args: unknown[]) => void): void

  /**
   * 이벤트 핸들러 제거
   * @param event 이벤트 이름
   * @param handler 제거할 핸들러
   */
  off(event: string, handler: (...args: unknown[]) => void): void

  /**
   * 모든 핸들러 제거
   * @param event 특정 이벤트만 제거 (생략 시 전체)
   */
  removeAllListeners(event?: string): void
}

/**
 * SOPIA 메인 API
 *
 * 권한에 따라 일부 API가 undefined일 수 있습니다.
 */
export interface SopiaAPI {
  /** 유저 API (read:users 권한 필요) */
  user?: SopiaUserAPI
  /** 라이브 API (read:lives 권한 필요) */
  live?: SopiaLiveAPI
  /** 채팅 API (write:lives 권한 필요) */
  chat?: SopiaChatAPI
  /** 팔로우 API (write:users 권한 필요) */
  follow?: SopiaFollowAPI
  /** Worker ↔ Renderer 통신 API (항상 사용 가능) */
  web: SopiaWebAPI
  /** SECRET API (항상 사용 가능) */
  secret: SopiaSecretAPI
  /** SQLite 데이터베이스 API (sqlite 권한 필요) */
  sqlite?: SopiaSqliteAPI
  /**
   * Native addon 로드 (addon 권한 필요)
   *
   * manifest.permissions.addon에 선언된 이름으로만 로드 가능합니다.
   * @param name manifest에 선언된 addon 이름
   * @returns 로드된 addon 모듈
   */
  loadAddon?: <T = unknown>(name: string) => T
}

// ============================================
// Storage API
// ============================================

/**
 * 확장앱 데이터 저장소 API
 *
 * 데이터는 storage.json 파일에 JSON 형식으로 저장됩니다.
 * 중첩 키를 지원합니다 (예: 'settings.theme')
 */
export interface StorageAPI {
  /**
   * 값 읽기
   * @param key 키 (중첩 키 지원: 'a.b.c')
   * @returns 저장된 값 또는 undefined
   */
  get<T = unknown>(key: string): T | undefined

  /**
   * 값 설정
   * @param key 키 (중첩 키 지원: 'a.b.c')
   * @param value 저장할 값
   */
  set(key: string, value: unknown): void

  /**
   * 값 삭제
   * @param key 삭제할 키
   */
  delete(key: string): void

  /**
   * 디스크에 저장
   * 변경 후 반드시 호출해야 영구 저장됩니다.
   */
  save(): Promise<void>
}

// ============================================
// Axios API (HTTP Client)
// ============================================

/**
 * Axios 응답
 */
export interface AxiosResponse<T = unknown> {
  data: T
  status: number
  statusText: string
  headers: Record<string, string>
}

/**
 * Axios 요청 설정
 */
export interface AxiosRequestConfig {
  headers?: Record<string, string>
  params?: Record<string, unknown>
  timeout?: number
  data?: unknown
}

/**
 * Axios HTTP 클라이언트 API
 *
 * manifest.json에 등록된 도메인으로만 요청할 수 있습니다.
 */
export interface AxiosAPI {
  /**
   * GET 요청
   */
  get<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>

  /**
   * POST 요청
   */
  post<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>

  /**
   * PUT 요청
   */
  put<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>

  /**
   * DELETE 요청
   */
  delete<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>

  /**
   * PATCH 요청
   */
  patch<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>

  /**
   * 허용된 도메인 목록
   */
  readonly allowedDomains: string[]
}

// ============================================
// Renderer API (window.$sopia)
// ============================================

/**
 * Renderer(webview)에서 사용하는 $sopia API
 */
export interface SopiaRendererAPI {
  /**
   * Worker로 이벤트 전송
   * @param event 이벤트 이름
   * @param args 전달할 데이터
   */
  emit(event: string, ...args: unknown[]): void

  /**
   * Worker에서 오는 이벤트 수신
   * @param event 이벤트 이름
   * @param handler 이벤트 핸들러
   */
  on(event: string, handler: (...args: unknown[]) => void): void

  /**
   * 이벤트 핸들러 제거
   * @param event 이벤트 이름
   * @param handler 제거할 핸들러
   */
  off(event: string, handler: (...args: unknown[]) => void): void

  /**
   * 일회성 이벤트 핸들러
   * @param event 이벤트 이름
   * @param handler 한 번만 실행될 핸들러
   */
  once(event: string, handler: (...args: unknown[]) => void): void

  /**
   * 모든 핸들러 제거
   * @param event 특정 이벤트만 제거 (생략 시 전체)
   */
  removeAllListeners(event?: string): void

  /**
   * 현재 확장앱 ID 조회
   */
  getExtensionId(): string
}

// ============================================
// Global Type Augmentation (Worker)
// ============================================

/**
 * Worker 전역 타입 선언
 *
 * 확장앱 Worker에서 사용할 수 있는 전역 객체들입니다.
 * tsconfig.json의 types에 이 파일을 포함하면 자동으로 타입이 적용됩니다.
 */
declare global {
  /** SOPIA API */
  const sopia: SopiaAPI
  /** 데이터 저장소 */
  const storage: StorageAPI
  /** HTTP 클라이언트 (허용된 도메인만) */
  const axios: AxiosAPI
}

// ============================================
// Manifest Types
// ============================================

/**
 * SOPIA API 권한 스코프
 */
export type SopiaScope =
  | 'read:users'
  | 'write:users'
  | 'read:lives'
  | 'write:lives'
  | 'sqlite'

/**
 * 권한 선언
 */
export interface PermissionDeclaration {
  /** 권한 스코프 또는 도메인 */
  scope?: SopiaScope
  domain?: string
  /** 권한이 필요한 이유 (사용자에게 표시) */
  reason: string
}

/**
 * Addon 권한 선언
 *
 * Native addon 모듈을 사용하기 위한 권한입니다.
 * 이 권한은 sandbox를 우회하므로 addon 라이선스가 필요합니다.
 */
export interface AddonPermission {
  /** addon 이름 (loadAddon()에서 사용) */
  name: string
  /** addon 경로 (확장앱 기준 상대경로, 예: './native/addon.node', './my-addon/') */
  path: string
  /** 권한이 필요한 이유 (사용자에게 표시) */
  reason: string
}

/**
 * Renderer 설정
 */
export interface ManifestRenderer {
  /** HTML 파일명 또는 외부 URL */
  url: string
  /** 로컬 파일의 루트 폴더 (기본: 확장앱 루트) */
  baseUrl?: string
}

/**
 * 확장앱 manifest.json 스키마
 */
export interface ExtensionManifest {
  /** 확장앱 이름 */
  name: string
  /** 버전 (semver 권장) */
  version: string
  /** 설명 */
  description?: string
  /** 메인 스크립트 파일 경로 */
  main: string
  /** 아이콘 이미지 경로 */
  icon?: string
  /** 개발자 이름 */
  author?: string
  /** 설정 페이지 설정 */
  renderer?: ManifestRenderer
  /** 권한 설정 */
  permissions?: {
    /** SOPIA API 권한 */
    sopia?: PermissionDeclaration[]
    /** HTTP 요청 허용 도메인 */
    axios?: PermissionDeclaration[]
    /** Native addon 모듈 권한 (addon 라이선스 필요) */
    addon?: AddonPermission[]
  }
  /**
   * 번들에 포함할 파일/폴더 목록
   * 지정하지 않으면 전체 폴더가 포함됩니다.
   * manifest.json과 secret.json은 자동으로 포함됩니다.
   * @example ["dist/", "renderer/dist/", "assets/"]
   */
  files?: string[]
}
