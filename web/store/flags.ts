export type Flag = keyof typeof defaultFlags

export type FeatureFlags = typeof defaultFlags

export const defaultFlags = {
  chub: false,
  parser: false,
  events: false,
  reporting: false,
  naiModel: true,
} satisfies { [key: string]: boolean }
