import { plainToClassFromExist } from 'class-transformer'
import cloneDeep from 'lodash/cloneDeep'
import merge from 'lodash/merge'
import { ConsoleLogger, type ILogger } from '../logger'
import { ApiError, ApiResponse, EmptyResult } from '../struct/response.struct'
import type { Spoon } from './spoon.client'

export type ClassType<T> = new (...args: any[]) => T

export interface HttpRequest extends Omit<RequestInit, 'body'> {
  body?: Record<string, any> | BodyInit
  params?: Record<string, any>
}

export class HttpClient {
  public userAgent =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36'
  public referer = 'https://www.spooncast.net'
  public logger: ILogger

  private baseConfig: HttpRequest = {
    headers: {
      'User-Agent': this.userAgent,
      Referer: `${this.referer}/`,
      Origin: this.referer
    }
  }
  constructor(
    private baseUrl: string,
    baseConfig: HttpRequest = {},
    logger?: ILogger
  ) {
    this.logger = logger ?? new ConsoleLogger()
    this.appendBaseConfig(baseConfig)
  }

  appendBaseConfig(config: HttpRequest) {
    const baseConfig = cloneDeep(this.baseConfig)
    this.baseConfig = merge({}, baseConfig, config)
  }

  removeBaseConfig(configKeys: string[]) {
    // 헤더 키인지 확인하여 처리
    const headerKeys: string[] = []
    const topLevelKeys: string[] = []

    for (const key of configKeys) {
      // 일반적으로 헤더 키는 소문자로 시작하거나 'x-'로 시작
      if (key.toLowerCase().startsWith('x-') || key.includes('-')) {
        headerKeys.push(key)
      } else {
        topLevelKeys.push(key)
      }
    }

    // 헤더에서 키 제거
    if (headerKeys.length > 0 && this.baseConfig.headers) {
      const headers = this.baseConfig.headers as Record<string, string>
      for (const headerKey of headerKeys) {
        delete headers[headerKey]
      }
    }

    // 최상위 키 제거
    if (topLevelKeys.length > 0) {
      this.baseConfig = Object.fromEntries(
        Object.entries(this.baseConfig).filter(([key]) => !topLevelKeys.includes(key))
      )
    }
  }

  async request<T>(
    path: string,
    options: HttpRequest,
    responseType?: ClassType<T>,
    resultType?: any
  ): Promise<T> {
    const requestOptions = cloneDeep(options)
    const url = new URL(path, this.baseUrl)
    if (typeof requestOptions.body === 'object' && requestOptions.constructor.name === 'Object') {
      requestOptions.body = JSON.stringify(requestOptions.body)
      requestOptions.headers = {
        'Content-Type': 'application/json',
        ...requestOptions.headers
      }
    }
    if (typeof requestOptions.params === 'object') {
      const params = url.searchParams
      for (const [key, value] of Object.entries(requestOptions.params)) {
        params.set(key, value)
      }
      requestOptions.params = params
    }
    const baseConfig = cloneDeep(this.baseConfig)
    const requestInitOptions = merge({}, baseConfig, requestOptions) as RequestInit

    this.logger.debug(`HTTP Request: ${requestInitOptions.method} ${url.toString()}`, requestInitOptions)
    const response = await fetch(url.toString(), requestInitOptions)
      .then((res) => {
        return res.json()
      })
      .catch((error) => {
        this.logger.error('HTTP Request failed', error)
        return {
          status_code: 500,
          message: 'Internal Server Error',
          error
        }
      })

    // Response 로깅 (간략하게)
    const statusCode = response?.status_code ?? response?.statusCode ?? 'N/A'
    const resPreview = JSON.stringify(response).slice(0, 200)
    this.logger.debug(
      `HTTP Response: ${statusCode} ${url.pathname}`,
      `${resPreview}${resPreview.length >= 200 ? '...' : ''}`
    )

    const responseData =
      responseType && resultType
        ? plainToClassFromExist(new responseType(this, requestOptions, resultType), response)
        : responseType
          ? plainToClassFromExist(responseType, response)
          : response
    return responseData as T
  }
}

export class ApiHttpClient {
  private requestQueue: Array<{
    resolve: (value: any) => void
    reject: (reason: any) => void
    path: string
    options: HttpRequest
    responseType: ClassType<any>
    res: ApiResponse<any>
  }> = []
  private isRefreshing = false
  private refreshPromise: Promise<boolean> | null = null

  constructor(
    public httpClient: HttpClient,
    private spoon: Spoon
  ) {}

  async request<T = EmptyResult>(
    path: string,
    options: HttpRequest,
    responseType: ClassType<T> = EmptyResult as ClassType<T>
  ): Promise<ApiResponse<T> | ApiError> {
    try {
      const res = await this.httpClient.request<ApiResponse<T>>(
        path,
        options,
        ApiResponse,
        responseType
      )

      // 토큰 만료 (460) 처리
      if (res.status_code === 460) {
        // 새로운 Promise를 만들어 큐 처리 결과를 기다림
        return await new Promise<ApiResponse<T> | ApiError>((resolve, reject) => {
          // 큐에 현재 요청 추가
          this.requestQueue.push({
            resolve,
            reject,
            path,
            options,
            responseType,
            res
          })

          // 토큰 갱신 시작 (쓰로틀링 - 이미 갱신 중이면 추가 갱신 요청하지 않음)
          this.processTokenRefresh()
        })
      }
      if (res.status_code !== 200) {
        return plainToClassFromExist(new ApiError(), res)
      }

      // 정상적인 응답 처리
      // res.results = plainToClassFromExist(new responseType(), res.results) as T[]
      return res
    } catch (error) {
      this.httpClient.logger.error('API request error', error)
      throw error as any
    }
  }

  private async processTokenRefresh(): Promise<void> {
    // 이미 토큰 갱신 중이면 추가 갱신 요청하지 않음 (쓰로틀링)
    if (this.isRefreshing) return

    this.isRefreshing = true
    try {
      // 여러 요청이 동시에 이 함수를 호출할 수 있으므로 Promise 캐싱
      if (!this.refreshPromise) {
        this.refreshPromise = this.spoon.tokenRefresh()
      }

      // 토큰 갱신 시도
      const refreshSuccess = await this.refreshPromise
      this.httpClient.logger.debug('Token refresh result:', refreshSuccess)

      // 큐에 있는 모든 요청 처리
      if (refreshSuccess) {
        this.retryQueuedRequests()
      } else {
        this.rejectQueuedRequests()
      }
    } catch (error) {
      this.httpClient.logger.error('Token refresh process failed', error)
      // 토큰 갱신 실패 시 모든 요청 거부
      this.rejectQueuedRequests()
    } finally {
      this.isRefreshing = false
      this.refreshPromise = null
    }
  }

  private async retryQueuedRequests(): Promise<void> {
    // 대기 중인 요청 복사 후 큐 비우기
    const requests = [...this.requestQueue]
    this.requestQueue = []

    // 각 요청 재시도
    for (const { resolve, reject, path, options, responseType } of requests) {
      try {
        const res = await this.httpClient.request(path, options, ApiResponse)
        res.results = plainToClassFromExist(new responseType(), res.results)
        resolve(res)
      } catch (error) {
        reject(error)
      }
    }
  }

  private rejectQueuedRequests(): void {
    // 토큰 갱신 실패 시 모든 요청에 460 에러 그대로 반환
    const requests = [...this.requestQueue]
    this.requestQueue = []

    for (const { reject, res } of requests) {
      reject(res)
    }
  }
}
