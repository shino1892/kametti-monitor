import { CountryType } from '../const/country.const'
import { SnsValueType } from '../const/sns-type.const'

export interface SignInRequestData {
  country: CountryType
  sns_type: SnsValueType
  sns_id?: number | string
  password?: string
}
