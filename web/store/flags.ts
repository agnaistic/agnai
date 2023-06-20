export type Flag = keyof typeof defaultFlags

export type FeatureFlags = typeof defaultFlags

export const defaultFlags = {
  charv2: false,
  chub: false,
  slots: true,
  parser: false,
} satisfies { [key: string]: boolean }
