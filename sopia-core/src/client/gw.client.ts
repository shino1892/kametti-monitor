import { ChannelGateway } from '../gw/channel.gw'
import { FeedGateway } from '../gw/feed.gw'
import { PlayGateway } from '../gw/play.gw'
import { StoreGateway } from '../gw/store.gw'
import { UserGateway } from '../gw/user.gw'
import { ApiHttpClient, HttpClient } from './http.client'
import type { Spoon } from './spoon.client'

export class GatewayClient {
  public instance: ApiHttpClient

  public user: UserGateway
  public store: StoreGateway
  public play: PlayGateway
  public feed: FeedGateway
  public channel: ChannelGateway

  private httpClient: HttpClient

  constructor(private spoon: Spoon) {
    this.httpClient = new HttpClient(this.spoon.urls.gwApi)
    this.instance = new ApiHttpClient(this.httpClient, this.spoon)

    this.user = new UserGateway(this.instance)
    this.store = new StoreGateway(this.instance)
    this.play = new PlayGateway(this.instance)
    this.feed = new FeedGateway(this.instance)
    this.channel = new ChannelGateway(this.instance)
  }
}
