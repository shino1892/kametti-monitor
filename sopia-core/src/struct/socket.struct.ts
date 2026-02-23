import { instanceToPlain } from 'class-transformer'
import type { Live } from './live.struct'
import type { User } from './user.struct'

export class LiveSocketBase {
  public event!: string

  public type!: string

  public appversion!: string

  public useragent!: string

  public live_id!: number

  public trigger!: string

  public toJSON() {
    return instanceToPlain(this)
  }
}

export class LiveState extends LiveSocketBase {
  public user_id!: number
  public is_call!: boolean
  public is_chat!: string
  public is_freeze!: boolean
  public is_mute!: boolean
  public state!: string
  public close_status!: number
}

export class LiveRank extends LiveSocketBase {
  public order!: {
    effect: string
    incrby: number
    now: string
    prev: string
    rt_effect: string
    rt_incrby: number
    rt_now: string
    rt_prev: string
  }
}

export class LiveUpdate extends LiveSocketBase {
  public data!: {
    author: User
    live: Live
  }
}

export class LiveMessage extends LiveSocketBase {
  public data!: {
    live: {
      author: User
    }
    user: User
  }
  items!: any[]
  use_item!: any[]
  update_component!: {
    message: {
      value: string
    }
  }
}

export class LiveJoin extends LiveSocketBase {
  public data!: {
    live: Live
    author: User
  }
}

export class LiveLike extends LiveSocketBase {
  public data!: {
    live: Live
    author: User
  }
}
export class LivePresent extends LiveSocketBase {
  public data!: {
    live: Live
    author: User
    item_template_id: number
    amount: number
    combo: number
    sticker: string
    sticker_type: number
    donation_msg: string
    donation_audio: string
    subscriber_badge_color_code: string | null
  }
}

export class LivePresentLike extends LiveSocketBase {
  public data!: {
    user: User
  }
  public items!: any[]
  public use_items!: any[]
  public update_component!: {
    like: {
      value: number | null
      combo: number
      amount: number
      sticker: string
    }
    listener: number | null
    total_listener: number | null
    spoon: number | null
    close_air_time: string | null
    message: string | null
  }
}

export class LiveUseItem extends LiveSocketBase {
  public data!: {
    user: User
  }

  public items!: any[]
  public use_items!: Array<{
    item_id: number
    amount: number
    combo: number
    effect: string
    animation_type: string
    images: Array<{ url: string }>
  }>
  public update_component!: {
    like: {
      value: number | null
      combo: number
      amount: number
      sticker: string | null
    }
    listener: number | null
    total_listener: number | null
    spoon: number | null
    close_air_time: string | null
    message: string | null
  }
}

export class LiveBlock extends LiveSocketBase {
  public data!: {
    live: Live
    author: User
    generator: {
      id: number
      nickname: string
    }
  }
}

export type LiveStruct =
  | LiveJoin
  | LiveState
  | LiveUpdate
  | LiveLike
  | LivePresent
  | LivePresentLike
  | LiveUseItem
