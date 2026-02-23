import type { ApiHttpClient } from '../client/http.client'
import type { LuckyBoxItemId, QuizItemId } from '../const/play.const'
import { QuizOption } from '../interfaces/play.interface'
import type { Live } from '../struct/live.struct'
import {
  AcceptLuckyBox,
  AcceptQuiz,
  CreateLuckyBox,
  CreateQuiz,
  SelectLuckyBox,
  SelectQuiz
} from '../struct/play.struct'

export class PlayGateway {
  constructor(private http: ApiHttpClient) {}

  createLuckyBox(
    live: Live,
    itemId: (typeof LuckyBoxItemId)[keyof typeof LuckyBoxItemId],
    message: string,
    options: boolean[]
  ) {
    return this.http.request(
      `/lives/${live.stream_name}/lucky-box/`,
      {
        method: 'POST',
        body: {
          targetId: live.author.id,
          itemId,
          message,
          options
        }
      },
      CreateLuckyBox
    )
  }

  acceptLuckyBox(live: Live, donationId: number) {
    return this.http.request(
      `/lives/${live.stream_name}/lucky-box/${donationId}/accepts/`,
      {
        method: 'PUT'
      },
      AcceptLuckyBox
    )
  }

  selectLuckyBox(live: Live, donationId: number, selectedNumber: number | null) {
    return this.http.request(
      `/lives/${live.stream_name}/lucky-box/${donationId}/selects/`,
      {
        method: 'PUT',
        body: {
          selectedNumber
        }
      },
      SelectLuckyBox
    )
  }

  createQuiz(
    live: Live,
    itemId: (typeof QuizItemId)[keyof typeof QuizItemId],
    message: string,
    options: QuizOption[]
  ) {
    return this.http.request(
      `/lives/${live.stream_name}/quiz/`,
      {
        method: 'POST',
        body: {
          roomId: null,
          targetId: live.author.id,
          itemId,
          message,
          options
        }
      },
      CreateQuiz
    )
  }

  acceptQuiz(live: Live, donationId: number) {
    return this.http.request(
      `/lives/${live.stream_name}/quiz/${donationId}/accepts/`,
      {
        method: 'PUT'
      },
      AcceptQuiz
    )
  }

  selectQuiz(live: Live, donationId: number, selectedNumber: number | null) {
    return this.http.request(
      `/lives/${live.stream_name}/quiz/${donationId}/selects/`,
      {
        method: 'PUT',
        body: {
          selectedNumber
        }
      },
      SelectQuiz
    )
  }
}
