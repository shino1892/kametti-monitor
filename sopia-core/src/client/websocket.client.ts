import { plainToInstance } from "class-transformer";
import { EventEmitter2 } from "eventemitter2";
import WebSocket from "ws";
import type { Spoon } from "../client/spoon.client";
import { LiveEvent } from "../const/socket.const";
import { type LivePlay, MailboxEndPayload, MailboxStartPayload, MailboxUpdatePayload, PlayDonationTray, PlayLuckyBoxAccept, PlayLuckyBoxCreate, PlayLuckyBoxResult, PlayQuizAccept, PlayQuizCreate, PlayQuizResult, PollEndPayload, PollStartPayload, PollUpdatePayload } from "../struct/play.struct";
import { LiveBlock, LiveJoin, LiveLike, LiveMessage, LivePresent, LivePresentLike, LiveRank, LiveState, type LiveStruct, LiveUpdate, LiveUseItem } from "../struct/socket.struct";

export type LiveSocketEvents = {
  [LiveEvent.LIVE_JOIN]: (event: LiveJoin) => any;
  [LiveEvent.LIVE_STATE]: (event: LiveState) => any;
  [LiveEvent.LIVE_UPDATE]: (event: LiveUpdate) => any;
  [LiveEvent.LIVE_MESSAGE]: (event: LiveMessage) => any;
  [LiveEvent.LIVE_BLOCK]: (event: LiveBlock) => any;
  [LiveEvent.LIVE_LIKE]: (event: LiveLike) => any;
  [LiveEvent.LIVE_PRESENT]: (event: LivePresent) => any;
  [LiveEvent.LIVE_PRESENT_LIKE]: (event: LivePresentLike) => any;
  [LiveEvent.LIVE_USE_ITEM]: (event: LiveUseItem) => any;
  [LiveEvent.LIVE_PLAY]: (event: LivePlay) => any;
  [LiveEvent.LIVE_RANK]: (event: LiveRank) => any;
  [LiveEvent.LIVE_EVENT_ALL]: (eventName: keyof LiveSocketEvents, event: LiveStruct | LivePlay) => any;
  ["hook:before"]: (eventName: keyof LiveSocketEvents, event: LiveStruct | LivePlay) => any;
  ["hook:after"]: (eventName: keyof LiveSocketEvents, event: LiveStruct | LivePlay) => any;

  [LiveEvent.LIVE_LUCKYBOX_CREATE]: (event: PlayLuckyBoxCreate) => any;
  [LiveEvent.LIVE_LUCKYBOX_ACCEPT]: (event: PlayLuckyBoxAccept) => any;
  [LiveEvent.LIVE_LUCKYBOX_RESULT]: (event: PlayLuckyBoxResult) => any;
  [LiveEvent.LIVE_QUIZ_CREATE]: (event: PlayQuizCreate) => any;
  [LiveEvent.LIVE_QUIZ_ACCEPT]: (event: PlayQuizAccept) => any;
  [LiveEvent.LIVE_QUIZ_RESULT]: (event: PlayQuizResult) => any;
  [LiveEvent.LIVE_DONATION_TRAY]: (event: PlayDonationTray) => any;

  [LiveEvent.LIVE_MAILBOX_START]: (event: MailboxStartPayload) => any;
  [LiveEvent.LIVE_MAILBOX_UPDATE]: (event: MailboxUpdatePayload) => any;
  [LiveEvent.LIVE_MAILBOX_END]: (event: MailboxEndPayload) => any;

  [LiveEvent.LIVE_POLL_START]: (event: PollStartPayload) => any;
  [LiveEvent.LIVE_POLL_UPDATE]: (event: PollUpdatePayload) => any;
  [LiveEvent.LIVE_POLL_END]: (event: PollEndPayload) => any;
};

export function eventMapper(data: any): [keyof LiveSocketEvents, any] {
  if (data.eventName) {
    switch (data.eventName) {
      case "LuckyBoxCreate":
        return [LiveEvent.LIVE_LUCKYBOX_CREATE, plainToInstance(PlayLuckyBoxCreate, data)];
      case "LuckyBoxAccept":
        return [LiveEvent.LIVE_LUCKYBOX_ACCEPT, plainToInstance(PlayLuckyBoxAccept, data)];
      case "LuckyBoxResult":
        return [LiveEvent.LIVE_LUCKYBOX_RESULT, plainToInstance(PlayLuckyBoxResult, data)];
      case "QuizStart":
        return [LiveEvent.LIVE_QUIZ_CREATE, plainToInstance(PlayQuizCreate, data)];
      case "QuizAccept":
        return [LiveEvent.LIVE_QUIZ_ACCEPT, plainToInstance(PlayQuizAccept, data)];
      case "QuizResult":
        return [LiveEvent.LIVE_QUIZ_RESULT, plainToInstance(PlayQuizResult, data)];
      case "DonationTray":
        return [LiveEvent.LIVE_DONATION_TRAY, plainToInstance(PlayDonationTray, data)];

      // LivePlayMailbox 이벤트 처리 (새 형식)
      // format: { eventName: "LivePlayMailbox", eventPayload: { mailboxId, mailboxCommand, mailboxTitle, mailboxCount, submitter } }
      case "LivePlayMailbox": {
        const payload = data.eventPayload || {};
        const command = payload.mailboxCommand as string;
        // 기존 페이로드 형식으로 변환
        const transformed = {
          event: LiveEvent.LIVE_PLAY,
          live_id: payload.liveId || 0,
          play_type: "mailbox",
          mailbox: {
            id: payload.mailboxId,
            title: payload.mailboxTitle,
            total_count: payload.mailboxCount || 0,
            // UPDATE 시 추가 필드
            message: payload.submitter?.message,
            is_anonymous: payload.submitter?.isAnonymous,
            profile_url: payload.submitter?.profileUrl,
            nickname: payload.submitter?.nickname,
            message_id: payload.submitter?.messageId,
            is_publish: payload.isPublish,
          },
        };
        if (command === "START") {
          return [LiveEvent.LIVE_MAILBOX_START, plainToInstance(MailboxStartPayload, { ...transformed, emit_type: "play_start" })];
        }
        if (command === "UPDATE") {
          return [LiveEvent.LIVE_MAILBOX_UPDATE, plainToInstance(MailboxUpdatePayload, { ...transformed, emit_type: "play_update" })];
        }
        if (command === "END") {
          return [LiveEvent.LIVE_MAILBOX_END, plainToInstance(MailboxEndPayload, { ...transformed, emit_type: "play_end" })];
        }
        break;
      }

      // LivePlayPoll 이벤트 처리 (새 형식)
      // format: { eventName: "LivePlayPoll", eventPayload: { pollId, pollTitle, pollCommand, pollOptions, pollTotalCount } }
      case "LivePlayPoll": {
        const payload = data.eventPayload || {};
        const command = payload.pollCommand as string;
        // 기존 페이로드 형식으로 변환
        const transformed = {
          event: LiveEvent.LIVE_PLAY,
          live_id: payload.liveId || 0,
          play_type: "poll",
          poll: {
            id: payload.pollId,
            title: payload.pollTitle,
            total_count: payload.pollTotalCount || 0,
            items: (payload.pollOptions || []).map((opt: any, idx: number) => ({
              item_order: opt.order ?? idx,
              name: opt.title || opt.name,
            })),
            // END 시 결과 데이터
            result: payload.pollResult,
          },
        };
        if (command === "START") {
          return [LiveEvent.LIVE_POLL_START, plainToInstance(PollStartPayload, { ...transformed, emit_type: "play_start" })];
        }
        if (command === "UPDATE") {
          return [LiveEvent.LIVE_POLL_UPDATE, plainToInstance(PollUpdatePayload, { ...transformed, emit_type: "play_update" })];
        }
        if (command === "END") {
          return [LiveEvent.LIVE_POLL_END, plainToInstance(PollEndPayload, { ...transformed, emit_type: "play_end" })];
        }
        break;
      }
    }
  }
  switch (data.event) {
    case LiveEvent.LIVE_JOIN:
      return [LiveEvent.LIVE_JOIN, plainToInstance(LiveJoin, data)];
    case LiveEvent.LIVE_STATE:
      return [LiveEvent.LIVE_STATE, plainToInstance(LiveState, data)];
    case LiveEvent.LIVE_MESSAGE:
      return [LiveEvent.LIVE_MESSAGE, plainToInstance(LiveMessage, data)];
    case LiveEvent.LIVE_BLOCK:
      return [LiveEvent.LIVE_BLOCK, plainToInstance(LiveBlock, data)];
    case LiveEvent.LIVE_UPDATE:
      return [LiveEvent.LIVE_UPDATE, plainToInstance(LiveUpdate, data)];
    case LiveEvent.LIVE_LIKE:
      return [LiveEvent.LIVE_LIKE, plainToInstance(LiveLike, data)];
    case LiveEvent.LIVE_PRESENT:
      return [LiveEvent.LIVE_PRESENT, plainToInstance(LivePresent, data)];
    case LiveEvent.LIVE_PRESENT_LIKE:
      return [LiveEvent.LIVE_PRESENT_LIKE, plainToInstance(LivePresentLike, data)];
    case LiveEvent.LIVE_USE_ITEM:
      return [LiveEvent.LIVE_USE_ITEM, plainToInstance(LiveUseItem, data)];
    case LiveEvent.LIVE_RANK:
      return [LiveEvent.LIVE_RANK, plainToInstance(LiveRank, data)];
    case LiveEvent.LIVE_PLAY:
      if (data.play_type === "mailbox" && data.emit_type === "play_start") {
        return [LiveEvent.LIVE_MAILBOX_START, plainToInstance(MailboxStartPayload, data)];
      }
      if (data.play_type === "mailbox" && data.emit_type === "play_update") {
        return [LiveEvent.LIVE_MAILBOX_UPDATE, plainToInstance(MailboxUpdatePayload, data)];
      }
      if (data.play_type === "mailbox" && data.emit_type === "play_end") {
        return [LiveEvent.LIVE_MAILBOX_END, plainToInstance(MailboxEndPayload, data)];
      }

      if (data.play_type === "poll" && data.emit_type === "play_start") {
        return [LiveEvent.LIVE_POLL_START, plainToInstance(PollStartPayload, data)];
      }
      if (data.play_type === "poll" && data.emit_type === "play_update") {
        return [LiveEvent.LIVE_POLL_UPDATE, plainToInstance(PollUpdatePayload, data)];
      }
      if (data.play_type === "poll" && data.emit_type === "play_end") {
        return [LiveEvent.LIVE_POLL_END, plainToInstance(PollEndPayload, data)];
      }
  }
  return ["" as keyof LiveSocketEvents, data];
}

// EventEmitter2에 타입 안전성을 추가하는 방법
export class WebSocketClient extends EventEmitter2 {
  // TypedEmitter의 타입 안전성을 위한 메서드 오버라이드
  declare emit: <K extends keyof LiveSocketEvents>(event: K, ...args: Parameters<LiveSocketEvents[K]>) => boolean;

  declare on: <K extends keyof LiveSocketEvents>(event: K, listener: LiveSocketEvents[K]) => this;

  declare once: <K extends keyof LiveSocketEvents>(event: K, listener: LiveSocketEvents[K]) => this;

  declare off: <K extends keyof LiveSocketEvents>(event: K, listener: LiveSocketEvents[K]) => this;
  private ws: WebSocket | null = null;
  constructor(protected spoon: Spoon) {
    super();
  }

  connect(url: string, options: WebSocket.ClientOptions) {
    return new Promise((resolve, reject) => {
      let isResolved = false;

      // URLにトークンが含まれていない場合、httpClient等から取得して付与する処理を追記
      console.log(`url:${url}`);
      let finalUrl = url.replace("jp-hala.spooncast.net", "jp-wala.spooncast.net");
      console.log(`finalUrl:${finalUrl}`);
      // URLにまだトークンが含まれていない場合のみ付加
      // 2. トークン付与。ここが重要！ 'url' ではなく 'finalUrl' を更新してください。
      if (!finalUrl.includes("token=")) {
        const token = this.spoon.token.replace("Bearer ", "");
        const separator = finalUrl.includes("?") ? "&" : "?";
        finalUrl = `${finalUrl}${separator}token=${token}`; // finalUrl を更新
      }

      try {
        const wsOptions: WebSocket.ClientOptions = {
          ...options,
          headers: {
            ...options.headers,

            Origin: "https://www.spooncast.net",
            "User-Agent": this.spoon.http.userAgent,
          },
        };

        // デバッグ：修正後のURLを確実にログに出す
        this.spoon.logger.info("🚀 [WebSocket] Connecting to:", finalUrl);

        this.ws = new WebSocket(finalUrl, wsOptions);

        this.ws.onmessage = this.receiver.bind(this);
        this.ws.onopen = () => {
          isResolved = true;
          this.spoon.logger.info("[WebSocket] Connected to:", url);
          resolve(this);
        };
        this.ws.onclose = (event) => {
          this.spoon.logger.info("[WebSocket] Disconnected:", event.code, event.reason);
        };
        this.ws.onerror = (event) => {
          console.error("[WebSocket Debug] Full Error Event:", event);
          if (event.message) console.error("[WebSocket Debug] Message:", event.message);
          const error = new Error("WebSocket error");
          this.spoon.logger.error("[WebSocket] Error:", error);
          // 연결 성공 전에만 reject 호출
          if (!isResolved) {
            reject(error);
          }
        };
      } catch (error) {
        this.spoon.logger.error("[WebSocket] Connection failed", error);
        reject(error);
      }
    });
  }

  private async receiver(msg: WebSocket.MessageEvent): Promise<void> {
    const data: any = JSON.parse(msg.data as string);
    this.spoon.logger.debug("[WebSocket] Received message:", msg.data);
    const [event, instance] = eventMapper(data);

    await this.emitAsync("hook:before", event, instance);
    if (event) {
      this.emit(event, instance);
    }
    if (data.event === LiveEvent.LIVE_PLAY) {
      this.emit(LiveEvent.LIVE_PLAY, instance);
    }
    this.emit(LiveEvent.LIVE_EVENT_ALL, event, instance);
    await this.emitAsync("hook:after", event, instance);
  }

  public send(data: any): void {
    const sendData: any = data;
    if (sendData.token) {
      if (!sendData.token.match(/^Bearer/)) {
        sendData.token = `Bearer ${sendData.token}`;
      }
    }
    const strData: string = JSON.stringify(sendData);
    this.spoon.logger.debug("[WebSocket] Sending message:", strData);
    this.ws?.send(strData);
  }

  public sendAndWaitForResponse<T extends keyof Exclude<LiveSocketEvents, "LIVE_EVENT_ALL">>(message: Record<string, unknown>, responseEvent: T, timeout = 0): Promise<Parameters<LiveSocketEvents[T]>[0]> {
    return new Promise((resolve, reject) => {
      const listener = (data: Parameters<LiveSocketEvents[T]>[0]) => {
        this.off(responseEvent, listener as any);
        resolve(data);
      };
      this.once(responseEvent, listener as any);
      this.send(message);

      if (timeout > 0) {
        setTimeout(() => {
          this.off(responseEvent, listener as any);
          reject(new Error("Timeout"));
        }, timeout);
      }
    });
  }

  public disconnect() {
    this.ws?.close();
    this.ws = null;
  }
}
