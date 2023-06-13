export type Flag = keyof typeof defaultFlags

export type FeatureFlags = typeof defaultFlags

export const defaultFlags = {
  charv2: false,
  chub: false,
  slots: true,
} satisfies { [key: string]: boolean }
