import { Transform, Type } from 'class-transformer'

export class InventoryItem {
  @Type(() => Date)
  @Transform(({ value }) => new Date(value))
  expire_at!: Date

  id!: number

  item_category!: string

  max_use_count_per_once_use!: number

  permanence_type!: string

  remaining_use_count!: number

  thumbnail!: {
    display_type: string
    url: string
  }

  title!: string

  use_targeting_type!: string
}
