export type Flag = keyof typeof defaultFlags

export type FeatureFlags = typeof defaultFlags

export const defaultFlags = {
  chub: false,
  reporting: false,
  naiModel: false,
  actions: false,
  regen: false,
  caption: false,
  debug: false,
  folders: false,
  sounds: false,
  google: false,
  reschema: false,
} satisfies { [key: string]: boolean }
