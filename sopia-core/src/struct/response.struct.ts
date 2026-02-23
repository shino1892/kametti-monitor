import { Exclude, Expose, instanceToPlain, Type } from 'class-transformer'
import type { HttpClient } from '../client/http.client'

export class HttpResponse {}

/**
 * 빈 응답용 클래스 (follow, like 등 결과 데이터가 없는 API용)
 */
export class EmptyResult {}

export class ApiResponse<T> extends HttpResponse {
  status_code!: number
  detail!: string
  next!: string
  previous!: string

  @Type((options) => (options?.newObject as ApiResponse<T>).type)
  results!: T[]

  @Exclude()
  private type: any

  @Exclude()
  private http: HttpClient

  @Exclude()
  private options: any

  constructor(http: HttpClient, options: any, genericClass: any) {
    super()
    this.http = http
    this.options = options
    this.type = genericClass
  }

  @Exclude()
  canNextRequest() {
    return !!this.next
  }

  @Exclude()
  nextRequest() {
    if (this.next) {
      return this.http.request(this.next, this.options, this.type)
    }
    throw new Error('No next request URL')
  }

  @Exclude()
  canPreviousRequest() {
    return !!this.previous
  }

  @Exclude()
  previousRequest() {
    if (this.previous) {
      return this.http.request(this.previous, this.options, this.type)
    }
    throw new Error('No previous request URL')
  }

  @Exclude()
  toJSON() {
    return instanceToPlain(this)
  }
}

export class ApiError extends HttpResponse {
  status_code!: number
  detail!: string
  error!: {
    code: number
    message: string
    status_code: number
  }

  @Exclude()
  toJSON() {
    return instanceToPlain(this)
  }
}
