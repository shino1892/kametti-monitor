import type { ApiHttpClient } from '../client/http.client'
import type { Spoon } from '../client/spoon.client'
import type { SignInRequestData } from '../dto/auth.dto'
import { ApiError, type ApiResponse } from '../struct/response.struct'
import { User } from '../struct/user.struct'

export class AuthApi {
  constructor(
    private http: ApiHttpClient,
    private spoon: Spoon
  ) {}

  async signIn(requestData: SignInRequestData): Promise<ApiResponse<User>> {
    const res = await this.http.request('/signin/', { method: 'POST', body: requestData }, User)
    if (res instanceof ApiError) {
      throw res
    }
    return res
  }
}
