export class Sticker {
  tag!: string
  name!: string
  title!: string
  description!: string
  isCashout!: number
  display!: number
  type!: number
  price!: number
  color!: string
  color_web!: string
  image_thumbnail!: string
  image_thumbnail_web!: string
  image_urls!: string[]
  image_url_web!: string
  lottie_url!: string
  lottie_combo_url!: string
  order!: number
  is_used!: boolean
  start_date!: string
  end_date!: string
  updated!: string
  category!: string
  dj_id!: number
  is_cashout!: number
  is_signature!: boolean
}

export class StickerCategory {
  id!: number
  name!: string
  title!: string
  is_used!: boolean
  stickers!: Sticker[]
}

export class StaticStickers {
  version!: number
  updated!: string
  categories!: StickerCategory[]
}
