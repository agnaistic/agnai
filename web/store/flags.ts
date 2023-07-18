export type Flag = keyof typeof defaultFlags

export type FeatureFlags = typeof defaultFlags

export const defaultFlags = {
  chub: false,
  parser: true,
  events: false,
  reporting: false,
  naiModel: false,
} satisfies { [key: string]: boolean }
