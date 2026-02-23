import 'reflect-metadata'

export * from './client/api.client'
export * from './client/http.client'
export * from './client/live.client'
export * from './client/spoon.client'
export * from './client/sticker.client'
export * from './client/websocket.client'
export * from './const/category.const'
export * from './const/country.const'
export * from './const/play.const'
export * from './const/sns-type.const'
export * from './const/socket.const'
export * from './interfaces/live.interface'
export * from './interfaces/play.interface'
export * from './interfaces/tier.interface'
export * from './logger'
export * from './struct/api.struct'
export * from './struct/channel.struct'
export * from './struct/feed.struct'
export * from './struct/live.struct'
export * from './struct/play.struct'
export * from './struct/response.struct'
export * from './struct/socket.struct'
export * from './struct/sticker.struct'
export * from './struct/store.struct'
export * from './struct/user.struct'

// v2 Protocol exports (Heimdallr2)
// v2 is the recommended protocol for new implementations
export * as v2 from './v2'
export { SpoonV2, LiveClientV2, WebSocketClientV2 } from './v2'
export type { LiveSocketEventsV2, SpoonConfigV2 } from './v2'

// Extension types
// 확장앱 개발을 위한 타입 정의
export * as extension from './extension'
export type {
  // API Types
  SopiaAPI,
  SopiaUserAPI,
  SopiaLiveAPI,
  SopiaChatAPI,
  SopiaFollowAPI,
  SopiaWebAPI,
  SopiaRendererAPI,
  StorageAPI,
  AxiosAPI,
  AxiosResponse,
  AxiosRequestConfig,
  // Event Types
  LiveEventName,
  LiveEventPayload,
  LiveInfo,
  // Manifest Types
  ExtensionManifest,
  SopiaScope,
  PermissionDeclaration,
  ManifestRenderer
} from './extension'
