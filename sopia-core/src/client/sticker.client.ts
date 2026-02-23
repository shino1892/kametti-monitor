import type { Spoon } from '../client/spoon.client'
import { StaticStickers, type Sticker } from '../struct/sticker.struct'

export class StickerClient {
  public stickers!: StaticStickers
  public signature: Map<number, StaticStickers> = new Map()

  constructor(private spoon: Spoon) {}

  async initSticker(): Promise<StaticStickers> {
    this.stickers = await this.spoon.http.request(
      this.spoon.urls.stickerApiUrl,
      {
        method: 'GET'
      },
      StaticStickers
    )
    return this.stickers
  }

  async initSignatureSticker(user: number): Promise<StaticStickers | undefined> {
    try {
      const res = await this.spoon.http.request(
        this.spoon.urls.signatureStickerApiUrl.replace('0000', user.toString()),
        {
          method: 'GET'
        },
        StaticStickers
      )

      if (res) {
        this.signature.set(user, res)
      }
    } catch {
      return
    }
    return this.signature.get(user)
  }

  findSticker(key: string, user?: number, force = false): Sticker | undefined {
    const signature = this.signature.get(user as number)
    if (signature) {
      for (const category of signature.categories) {
        if (!force && !category.is_used) {
          continue
        }
        for (const sticker of category.stickers) {
          if (sticker.name === key) {
            return sticker
          }
        }
      }
    }
    if (this.stickers) {
      for (const category of this.stickers.categories) {
        if (!force && !category.is_used) {
          continue
        }
        for (const sticker of category.stickers) {
          if (sticker.name === key) {
            return sticker
          }
        }
      }
    }
  }
}
