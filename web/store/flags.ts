const flags = ['charv2', 'cyoa'] as const

type Flag = (typeof flags)[number]

export type FeatureFlags = { [key in Flag]: boolean }

export const defaultFlags: FeatureFlags = {
  charv2: false,
  cyoa: true,
}
