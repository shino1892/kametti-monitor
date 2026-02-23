import { LiveJoin, Spoon } from '../src'
import { LiveEvent } from '../src/const/socket.const'

if (!process.env.LOGIN_TOKEN) {
  console.log('need LOGIN_TOKEN env')
  process.exit(1)
}
;(async () => {
  const spoon = new Spoon()
  await spoon.init()
  spoon.setToken(process.env.LOGIN_TOKEN as string)

  const live = await spoon.live.join(39969783)

  console.log('connect!', live.info)
  live.on(LiveEvent.LIVE_EVENT_ALL, (event) => {
    console.log('live_receive', event)
  })

  live.on(LiveEvent.LIVE_JOIN, (event: LiveJoin) => {
    event.data.author.id
  })

  live.on(LiveEvent.LIVE_MAILBOX_START, (event) => {})
})()
