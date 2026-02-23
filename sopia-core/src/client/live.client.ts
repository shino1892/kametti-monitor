import { merge } from 'lodash'
import { LiveEvent, LiveType } from '../const/socket.const'
import { Live } from '../struct/live.struct'
import type { Spoon } from './spoon.client'
import { WebSocketClient } from './websocket.client'

export class LiveClient extends WebSocketClient {
  private maxLengthPerSend = 200
  private currentLive: Live | null = null
  private roomJwt: string | null = null
  constructor(protected spoon: Spoon) {
    super(spoon)
  }

  get info() {
    return this.currentLive
  }

  async join(live: number | Live): Promise<LiveClient> {
    let liveInfo: Live | null = null
    if (live instanceof Live) {
      liveInfo = live
    } else {
      liveInfo = await this.spoon.api.live.getInfo(live)
    }

    if (!liveInfo) {
      throw new Error('Live Info not found')
    }

    const token = await this.spoon.api.live.getLiveToken(liveInfo.id)
    this.roomJwt = token.jwt

    // JWT 토큰을 liveInfo에 설정 (아이템 사용 등 API 호출 시 필요)
    liveInfo.jwt = this.roomJwt

    this.currentLive = liveInfo

    const userAgent = this.spoon.api.instance.httpClient.userAgent
    await this.connect(liveInfo.system.server, {
      headers: {
        'User-Agent': userAgent
      }
    })

    await this.sendAndWaitForResponse(
      {
        live_id: liveInfo.id.toString(),
        appversion: this.spoon.appVersion,
        user_id: this.spoon.logonUser.id,
        event: LiveEvent.LIVE_STATE,
        type: LiveType.LIVE_REQ,
        useragent: userAgent
      },
      LiveEvent.LIVE_STATE
    )

    await this.sendAndWaitForResponse(
      {
        live_id: liveInfo.id.toString(),
        appversion: this.spoon.appVersion,
        reconnect: false,
        retry: 0,
        token: this.roomJwt,
        event: LiveEvent.LIVE_JOIN,
        type: LiveType.LIVE_REQ,
        useragent: userAgent
      },
      LiveEvent.LIVE_JOIN
    )

    this.send({
      command: 'top',
      event: LiveEvent.LIVE_RANKLIST,
      live_id: liveInfo.id.toString(),
      type: LiveType.LIVE_REQ,
      user_id: this.spoon.logonUser.id.toString(),
      useragent: userAgent
    })

    this.spoon.api.instance.httpClient.appendBaseConfig({
      headers: {
        'x-live-authorization': `Bearer ${this.roomJwt}`
      }
    })
    this.spoon.gw.instance.httpClient.appendBaseConfig({
      headers: {
        'x-live-authorization': `Bearer ${this.roomJwt}`
      }
    })

    this.on(LiveEvent.LIVE_UPDATE, (event) => {
      this.currentLive = merge(this.currentLive, event.data.live)
    })

    this.on('hook:before', (_, event: any) => {
      if (event?.data?.user) {
        if (this.currentLive?.manager_ids?.length) {
          event.data.user.is_manager = this.currentLive?.manager_ids?.includes(event.data.user.id)
        } else {
          event.data.user.is_manager = false
        }
      }
      if (event?.data?.author) {
        if (this.currentLive?.manager_ids?.length) {
          event.data.author.is_manager = this.currentLive?.manager_ids?.includes(
            event.data.author.id
          )
        } else {
          event.data.author.is_manager = false
        }
      }
    })

    return this
  }

  async close() {
    this.send({
      appversion: this.spoon.appVersion,
      event: LiveEvent.LIVE_LEAVE,
      type: LiveType.LIVE_RPT,
      token: this.roomJwt,
      live_id: this.currentLive?.id.toString(),
      useragent: this.spoon.api.instance.httpClient.userAgent
    })

    if (this.currentLive?.author.id === this.spoon.logonUser.id) {
      await this.spoon.api.live.close(this.currentLive!)
    }
    this.currentLive = null
    this.disconnect()
    this.removeAllListeners()
    this.spoon.api.instance.httpClient.appendBaseConfig({
      headers: {
        'x-live-authorization': ''
      }
    })
    this.spoon.gw.instance.httpClient.appendBaseConfig({
      headers: {
        'x-live-authorization': ''
      }
    })
    this.spoon.api.instance.httpClient.removeBaseConfig(['x-live-authorization'])
    this.spoon.gw.instance.httpClient.removeBaseConfig(['x-live-authorization'])
  }

  message(message: string): void {
    const send = (text: string) => {
      if (text.trim() === '') {
        return
      }

      this.send({
        type: LiveType.LIVE_RPT,
        event: LiveEvent.LIVE_MESSAGE,
        appversion: this.spoon.appVersion,
        useragent: this.spoon.api.instance.httpClient.userAgent,
        token: this.roomJwt,
        message: text.replace(/"/g, '\\"')
      })
    }
    const splitted = message.split('\n')
    let str = ''

    for (let i = 0; i < splitted.length; i++) {
      const line = splitted[i]
      const needsNewline = i < splitted.length - 1 // 마지막 줄이 아니면 개행 필요
      const lineWithNewline = needsNewline ? `${line}\n` : line

      // 현재 문자열에 이 줄을 추가했을 때 길이 초과하는지 확인
      if (str.length + lineWithNewline.length > this.maxLengthPerSend) {
        // 현재까지 누적된 문자열이 있으면 전송
        if (str) {
          send(str)
          str = ''
        }

        // 한 줄 자체가 길이 제한을 초과하는 경우
        if (lineWithNewline.length > this.maxLengthPerSend) {
          const deserialize = (text: string) => {
            const arr = text.split('')
            const ret = []
            while (arr.length) {
              ret.push(arr.splice(0, this.maxLengthPerSend).join(''))
            }
            return ret
          }

          for (const s of deserialize(lineWithNewline)) {
            send(s)
          }
        } else {
          str = lineWithNewline
        }
      } else {
        str += lineWithNewline
      }
    }

    if (str) {
      send(str)
    }
  }
}
