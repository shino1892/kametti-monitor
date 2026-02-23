import type { ApiHttpClient } from '../client/http.client'
import type { Spoon } from '../client/spoon.client'
import type { Live } from '../struct/live.struct'
import {
  LivePlayStatus,
  Mailbox,
  MailboxMessage,
  Poll,
  type PollItem,
  PollVote
} from '../struct/play.struct'

export class PlayApi {
  constructor(
    private http: ApiHttpClient,
    private spoon: Spoon
  ) {}

  status(live: Live) {
    return this.http.request(
      '/play/status/',
      {
        method: 'GET',
        params: {
          live_id: live.id
        }
      },
      LivePlayStatus
    )
  }

  createPoll(live: Live, title: string, items: Pick<PollItem, 'title'>[]) {
    return this.http.request(
      '/play/poll/',
      {
        method: 'POST',
        body: {
          live_id: live.id,
          title,
          items
        }
      },
      Poll
    )
  }

  votePoll(pollId: number, itemId: number) {
    return this.http.request(
      `/play/poll/${pollId}/vote/`,
      {
        method: 'POST',
        body: {
          choice: itemId
        }
      },
      PollVote
    )
  }

  getPoll(pollId: number) {
    return this.http.request(
      `/play/poll/${pollId}/`,
      {
        method: 'GET'
      },
      Poll
    )
  }

  closePoll(pollId: number) {
    return this.http.request(
      `/play/poll/${pollId}/`,
      {
        method: 'PUT'
      },
      Poll
    )
  }

  createMailbox(live: Live, title: string) {
    return this.http.request(
      '/play/mailbox/',
      {
        method: 'POST',
        body: {
          live_id: live.id,
          title
        }
      },
      Mailbox
    )
  }

  sendMailbox(mailboxId: number, message: string, isAnonymous: boolean) {
    return this.http.request(
      `/play/mailbox/${mailboxId}/messages/`,
      {
        method: 'POST',
        body: {
          message,
          is_anonymous: isAnonymous
        }
      },
      MailboxMessage
    )
  }

  getMailbox(mailboxId: number) {
    return this.http.request(
      `/play/mailbox/${mailboxId}/`,
      {
        method: 'GET'
      },
      Mailbox
    )
  }

  getMailboxList(mailboxId: number) {
    return this.http.request(
      `/play/mailbox/${mailboxId}/messages/`,
      {
        method: 'GET'
      },
      MailboxMessage
    )
  }

  getCurrentMailbox(mailboxId: number) {
    return this.http.request(
      `/play/mailbox/${mailboxId}/current/`,
      {
        method: 'GET'
      },
      MailboxMessage
    )
  }

  setCurrentMailbox(mailboxId: number, messageId: number, isPublish: boolean) {
    return this.http.request(
      `/play/mailbox/${mailboxId}/current/`,
      {
        method: 'PUT',
        body: {
          message_id: messageId,
          is_publish: isPublish
        }
      },
      MailboxMessage
    )
  }

  removeMailbox(mailboxId: number, messageId: number) {
    return this.http.request(
      `/play/mailbox/${mailboxId}/remove/`,
      {
        method: 'POST',
        body: {
          message_id: messageId
        }
      },
      Mailbox
    )
  }

  closeMailbox(mailboxId: number) {
    return this.http.request(
      `/play/mailbox/${mailboxId}/`,
      {
        method: 'PUT'
      },
      Mailbox
    )
  }
}
