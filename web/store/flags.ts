export type Flag = keyof typeof defaultFlags

export type FeatureFlags = typeof defaultFlags

export const defaultFlags = {
  charv2: false,
  cyoa: true,
  chub: false,
} satisfies { [key: string]: boolean }
