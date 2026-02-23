import { ApiHttpClient } from '../client/http.client'
import { User } from '../struct/user.struct'

export class UserGateway {
  constructor(private http: ApiHttpClient) { }

  search(keyword: string, page_size = 10) {
    return this.http.request(
      '/search/user',
      {
        method: 'GET',
        params: {
          keyword,
          page_size
        }
      },
      User
    )
  }
}
