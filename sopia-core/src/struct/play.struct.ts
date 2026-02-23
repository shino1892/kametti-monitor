import { instanceToPlain, Transform, Type } from 'class-transformer'
import type { LuckyBoxItemId, QuizItemId } from '../const/play.const'
import type { User } from './user.struct'

// API 용

export class CreateLuckyBox {
  public roomId!: string
  public donationId!: number
  public senderId!: number
  public targetId!: number
  public itemId!: (typeof LuckyBoxItemId)[keyof typeof LuckyBoxItemId]
  public boxCount!: number
  public amount!: number
  public message!: string
  public created!: number
  public usableTotalCount!: number
}

export class AcceptLuckyBox {}

export class SelectLuckyBox {
  public isSuccess!: boolean
}

export class CreateQuiz {
  public roomId!: string
  public donationId!: number
  public senderId!: number
  public targetId!: number
  public itemId!: (typeof QuizItemId)[keyof typeof QuizItemId]
  public boxCount!: number
  public amount!: number
  public message!: string
  public timeLimit!: number
  public created!: number
  public usableTotalCount!: number
}

export class AcceptQuiz {}

export class SelectQuiz {
  public isSuccess!: boolean
}

// Socket 용

export class BaseGameEventPayload {
  public roomId!: string
  public donationId!: number
  public targetId!: number
  public itemId!: number
  public sender!: {
    userId: number
    nickname: string
    profileImageUrl: string
  }
  public created!: number

  public toJSON() {
    return instanceToPlain(this)
  }
}

// 럭키박스 생성 이벤트 페이로드
export class LuckyBoxCreatePayload extends BaseGameEventPayload {
  // 기본 필드만 사용
}

// 럭키박스 수락 이벤트 페이로드
export class LuckyBoxAcceptPayload extends BaseGameEventPayload {
  public boxInfo!: {
    boxCount: number
    message: string
    amount: number
  }
}

// 럭키박스 결과 이벤트 페이로드
export class LuckyBoxResultPayload extends BaseGameEventPayload {
  public result!: {
    isSuccess: boolean
    amount: number
    executionAmount: number
    options: boolean[]
    selectedNumber: number
  }
}

// 퀴즈 생성 이벤트 페이로드
export class QuizCreatePayload extends BaseGameEventPayload {
  public timeLimit!: number
}

// 퀴즈 수락 이벤트 페이로드
export class QuizAcceptPayload extends BaseGameEventPayload {
  public quizInfo!: {
    message: string
    options: string[]
    amount: number
    timeLimit: number
    startTime: number
    expirationTime: number
  }
}

// 퀴즈 결과 이벤트 페이로드
export class QuizResultPayload extends BaseGameEventPayload {
  public result!: {
    isSuccess: boolean
    amount: number
    executionAmount: number
    message: string
    options: Array<{
      option: string
      isCorrect: boolean
    }>
    selectedNumber: number
    isRandom: boolean
  }
}

// 도네이션 트레이 이벤트 페이로드
export class DonationTrayPayload {
  public roomId!: string
  public trays!: Array<{
    donationId: number
    sender: {
      userId: number
      nickname: string
      profileImageUrl: string
    }
    meta: {
      itemId: number
      category: string
      amount: number
    }
    created: number
  }>
}

// 기본 게임 이벤트 클래스 (LuckyBox와 Quiz 통합)
export abstract class PlayGameEvent {
  public abstract eventName: string
  public abstract eventPayload: BaseGameEventPayload | DonationTrayPayload
}

// 럭키박스 이벤트 클래스들
export class PlayLuckyBoxCreate extends PlayGameEvent {
  public eventName = 'LuckyBoxCreate' as const
  public eventPayload!: LuckyBoxCreatePayload
}

export class PlayLuckyBoxAccept extends PlayGameEvent {
  public eventName = 'LuckyBoxAccept' as const
  public eventPayload!: LuckyBoxAcceptPayload
}

export class PlayLuckyBoxResult extends PlayGameEvent {
  public eventName = 'LuckyBoxResult' as const
  public eventPayload!: LuckyBoxResultPayload
}

// 퀴즈 이벤트 클래스들
export class PlayQuizCreate extends PlayGameEvent {
  public eventName = 'QuizCreate' as const
  public eventPayload!: QuizCreatePayload
}

export class PlayQuizAccept extends PlayGameEvent {
  public eventName = 'QuizAccept' as const
  public eventPayload!: QuizAcceptPayload
}

export class PlayQuizResult extends PlayGameEvent {
  public eventName = 'QuizResult' as const
  public eventPayload!: QuizResultPayload
}

// 도네이션 트레이 이벤트 클래스
export class PlayDonationTray extends PlayGameEvent {
  public eventName = 'DonationTray' as const
  public eventPayload!: DonationTrayPayload
}

// 하위 호환성을 위한 타입 별칭
export type PlayLuckyBox =
  | PlayLuckyBoxCreate
  | PlayLuckyBoxAccept
  | PlayLuckyBoxResult
  | PlayDonationTray

// === Live Play 이벤트 구조 ===

// 기본 Live Play 이벤트 페이로드
export class BaseLivePlayPayload {
  public event!: 'live_play'
  public live_id!: number
  public emit_type!: string
  public play_type!: string

  public toJSON() {
    return instanceToPlain(this)
  }
}

// Mailbox 관련 페이로드들
export class MailboxStartPayload extends BaseLivePlayPayload {
  public emit_type = 'play_start' as const
  public play_type = 'mailbox' as const
  public mailbox!: {
    id: number
    title: string
    total_count: number
  }
}

export class MailboxUpdatePayload extends BaseLivePlayPayload {
  public emit_type = 'play_update' as const
  public play_type = 'mailbox' as const
  public mailbox!: {
    total_count?: number
    id?: number
    title?: string
    message?: string
    is_anonymous?: boolean
    profile_url?: string
    nickname?: string
    status?: number
    message_id?: number
    is_publish?: boolean
  }
}

export class MailboxEndPayload extends BaseLivePlayPayload {
  public emit_type = 'play_end' as const
  public play_type = 'mailbox' as const
  public mailbox!: {
    total_count: number
  }
}

// Poll 관련 페이로드들
export class PollStartPayload extends BaseLivePlayPayload {
  public emit_type = 'play_start' as const
  public play_type = 'poll' as const
  public poll!: {
    id: number
    title: string
    items: Array<{
      item_order: number
      name: string
    }>
  }
}

export class PollUpdatePayload extends BaseLivePlayPayload {
  public emit_type = 'play_update' as const
  public play_type = 'poll' as const
  public poll!: {
    total_count: number
  }
}

export class PollEndPayload extends BaseLivePlayPayload {
  public emit_type = 'play_end' as const
  public play_type = 'poll' as const
  public poll!: {
    id: number
    title: string
    result: Array<{
      item_order: number
      name: string
      count: number
    }>
  }
}

// 기본 Live Play 이벤트 클래스
export abstract class LivePlayEvent {
  public abstract event: 'live_play'
  public abstract live_id: number
  public abstract emit_type: string
  public abstract play_type: string
}

// Mailbox 이벤트 클래스들
export class LivePlayMailboxStart extends LivePlayEvent {
  public event = 'live_play' as const
  public emit_type = 'play_start' as const
  public play_type = 'mailbox' as const
  public live_id!: number
  public mailbox!: MailboxStartPayload['mailbox']
}

export class LivePlayMailboxUpdate extends LivePlayEvent {
  public event = 'live_play' as const
  public emit_type = 'play_update' as const
  public play_type = 'mailbox' as const
  public live_id!: number
  public mailbox!: MailboxUpdatePayload['mailbox']
}

export class LivePlayMailboxEnd extends LivePlayEvent {
  public event = 'live_play' as const
  public emit_type = 'play_end' as const
  public play_type = 'mailbox' as const
  public live_id!: number
  public mailbox!: MailboxEndPayload['mailbox']
}

// Poll 이벤트 클래스들
export class LivePlayPollStart extends LivePlayEvent {
  public event = 'live_play' as const
  public emit_type = 'play_start' as const
  public play_type = 'poll' as const
  public live_id!: number
  public poll!: PollStartPayload['poll']
}

export class LivePlayPollUpdate extends LivePlayEvent {
  public event = 'live_play' as const
  public emit_type = 'play_update' as const
  public play_type = 'poll' as const
  public live_id!: number
  public poll!: PollUpdatePayload['poll']
}

export class LivePlayPollEnd extends LivePlayEvent {
  public event = 'live_play' as const
  public emit_type = 'play_end' as const
  public play_type = 'poll' as const
  public live_id!: number
  public poll!: PollEndPayload['poll']
}

// Live Play 이벤트 통합 타입
export type LivePlay =
  | LivePlayMailboxStart
  | LivePlayMailboxUpdate
  | LivePlayMailboxEnd
  | LivePlayPollStart
  | LivePlayPollUpdate
  | LivePlayPollEnd

export class LivePlayStatus {
  in_progress!: boolean
  play_content!: {
    play_id: number
    play_type: string
  }
}

export class PollItem {
  id!: number
  title!: string
  count!: number
  name!: string
  item_order!: number
}

export class Poll {
  id!: number
  title!: string
  items!: PollItem[]
  my_choice!: number
  poll_count!: number
}

export class PollVote {
  poll_id!: number
  choice!: number
  total_count!: number
}

export class Mailbox {
  id!: number
  title!: string
}

export class MailboxMessage {
  id!: number
  mailbox_id!: number
  status!: number
  message!: string
  created!: string
  is_anonymous!: boolean
  nickname!: string
  profile_url!: string
}
