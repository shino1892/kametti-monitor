/**
 * v2 프로토콜 라이브 접속 테스트
 *
 * v2 프로토콜 특징:
 *   - WebSocket: 로그인 시 wss://{country}-wala.spooncast.net/ws?token={UserToken} 으로 연결
 *   - 프로그램 종료까지 WebSocket 연결 유지
 *   - 라이브 입장/퇴장: ACTIVATE_CHANNEL / DEACTIVATE_CHANNEL 명령
 *
 * 환경변수:
 *   USER_TOKEN - 스푼 액세스 토큰
 *   REFRESH_TOKEN - 스푼 리프레시 토큰 (선택)
 *   LIVE_ID - 접속할 라이브 ID
 *
 * 실행:
 *   USER_TOKEN=xxx LIVE_ID=12345 npx tsx test/v2-live-test.ts
 */

import 'reflect-metadata'
import 'dotenv/config'
import { SpoonV2 } from '../src/v2'
import { EventName } from '../src/const/v2/socket.const'
import { LogLevel } from '../src/logger'

async function main() {
  const userToken = process.env.USER_TOKEN
  const refreshToken = process.env.REFRESH_TOKEN || ''
  const liveId = process.env.LIVE_ID

  if (!userToken) {
    console.error('Error: USER_TOKEN 환경변수가 필요합니다.')
    process.exit(1)
  }

  if (!liveId) {
    console.error('Error: LIVE_ID 환경변수가 필요합니다.')
    process.exit(1)
  }

  console.log('=== v2 프로토콜 라이브 접속 테스트 ===')
  console.log('LIVE_ID:', liveId)

  const spoon = new SpoonV2('kr', {
    logLevel: LogLevel.INFO
  })

  try {
    // 1. 초기화
    console.log('\n[1] Spoon 클라이언트 초기화...')
    await spoon.init()

    // 2. 토큰 설정 (WebSocket 자동 연결)
    console.log('\n[2] 토큰 설정 및 WebSocket 연결...')
    await spoon.setToken(userToken, refreshToken)
    console.log('    로그인 유저:', spoon.logonUser.nickname, `(ID: ${spoon.logonUser.id})`)
    console.log('    WebSocket 연결:', spoon.ws.isConnected ? '성공' : '실패')

    // 3. WebSocket raw 메시지 디버깅 (spoon.ws에서 직접)
    console.log('\n[3] WebSocket 이벤트 리스너 등록...')
    spoon.ws.on('raw', (data, parsed) => {
      console.log('\n[RAW 수신]', new Date().toISOString())
      console.log('  데이터:', data.substring(0, 500) + (data.length > 500 ? '...' : ''))
      if (parsed) {
        console.log('  command:', parsed.command)
        if (parsed.payload) {
          console.log('  payload keys:', Object.keys(parsed.payload as object))
        }
      }
    })

    // 4. 라이브 이벤트 리스너 등록
    console.log('\n[4] 라이브 이벤트 리스너 등록...')

    spoon.live.on('event:all', (eventName, payload, raw) => {
      console.log(`\n[이벤트] ${eventName}`, new Date().toISOString())
      console.log('  payload:', JSON.stringify(payload, null, 2).substring(0, 300))
    })

    spoon.live.on(EventName.CHAT_MESSAGE, (payload) => {
      console.log(`[채팅] ${payload.generator.nickname}: ${payload.message}`)
    })

    spoon.live.on(EventName.ROOM_JOIN, (payload) => {
      console.log(`[입장] ${payload.generator.nickname} 님이 입장했습니다.`)
    })

    spoon.live.on(EventName.ROOM_KICK, (payload) => {
      console.log(`[강퇴] ${payload.targetUser.nickname} 님이 강퇴되었습니다.`)
    })

    spoon.live.on(EventName.LIVE_DONATION, (payload) => {
      console.log(`[후원] ${payload.nickname}: ${payload.sticker} x${payload.amount}`)
      if (payload.donationMessage) {
        console.log(`       메시지: ${payload.donationMessage}`)
      }
    })

    spoon.live.on(EventName.LIVE_FREE_LIKE, (payload) => {
      console.log(`[좋아요] ${payload.nickname}: ${payload.count}개`)
    })

    spoon.live.on(EventName.LIVE_META_UPDATE, (payload) => {
      console.log(`[업데이트] 청취자: ${payload.memberCount}, 좋아요: ${payload.likeCount}, 스푼: ${payload.spoonCount}`)
    })

    spoon.live.on('error', (error) => {
      console.error('[에러]', error)
    })

    spoon.live.on('disconnected', (code, reason) => {
      console.log(`[연결 종료] code: ${code}, reason: ${reason}`)
    })

    // 5. 라이브 입장
    console.log(`\n[5] 라이브 ${liveId} 입장 중...`)
    await spoon.live.join(Number(liveId))
    console.log('    입장 성공!')
    console.log('    방송 제목:', spoon.live.info?.title)
    console.log('    DJ:', spoon.live.info?.author.nickname)
    console.log('    채널 ID:', spoon.live.channel)

    console.log('\n[6] 이벤트 대기 중... (Ctrl+C로 종료)')

    // 7. 종료 처리
    process.on('SIGINT', async () => {
      console.log('\n\n[7] 라이브 퇴장 중...')
      await spoon.live.close()
      console.log('    라이브 퇴장 완료!')

      console.log('    WebSocket 연결 종료...')
      spoon.disconnectWebSocket()
      console.log('    완료!')
      process.exit(0)
    })

    // 연결 유지
    await new Promise(() => {})
  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  }
}

main()
