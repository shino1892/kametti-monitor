export const SnsType = {
  PHONE: 'phone',
  EMAIL: 'email',
  FACEBOOK: 'facebook',
  GOOGLE: 'google',
  APPLE: 'apple',
  TWITTER: 'twitter',
  LINE: 'line'
} as const

export type SnsValueType = (typeof SnsType)[keyof typeof SnsType]
