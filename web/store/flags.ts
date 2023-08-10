export type Flag = keyof typeof defaultFlags

export type FeatureFlags = typeof defaultFlags

export const defaultFlags = {
  chub: false,
  reporting: false,
  naiModel: false,
  actions: false,
  regen: false,
} satisfies { [key: string]: boolean }
