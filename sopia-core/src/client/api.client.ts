import { AuthApi } from '../api/auth.api'
import { LiveApi } from '../api/live.api'
import { PlayApi } from '../api/play.api'
import { UserApi } from '../api/users.api'
import { ApiHttpClient, HttpClient } from './http.client'
import type { Spoon } from './spoon.client'

export class ApiClient {
  public instance: ApiHttpClient

  public user: UserApi
  public auth: AuthApi
  public live: LiveApi
  public play: PlayApi

  private httpClient: HttpClient

  constructor(private spoon: Spoon) {
    this.httpClient = new HttpClient(this.spoon.urls.api)
    this.instance = new ApiHttpClient(this.httpClient, this.spoon)

    this.user = new UserApi(this.instance, this.spoon)
    this.auth = new AuthApi(this.instance, this.spoon)
    this.live = new LiveApi(this.instance, this.spoon)
    this.play = new PlayApi(this.instance, this.spoon)
  }
}
