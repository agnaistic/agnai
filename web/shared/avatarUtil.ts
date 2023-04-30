import { AvatarSize } from '../store'

// if you change the width values, you must also update Message.css
export const avatarSizes: Record<AvatarSize, { avatarColumn: string; messageColumn: string }> = {
  xs: { avatarColumn: 'w-6 sm:w-6', messageColumn: 'msg-with-xs-avatar' },
  sm: { avatarColumn: 'w-8 sm:w-8', messageColumn: 'msg-with-sm-avatar' },
  md: { avatarColumn: 'w-8 sm:w-10', messageColumn: 'msg-with-md-avatar' },
  lg: { avatarColumn: 'w-8 sm:w-12', messageColumn: 'msg-with-lg-avatar' },
  xl: { avatarColumn: 'w-10 sm:w-16', messageColumn: 'msg-with-xl-avatar' },
  '2xl': { avatarColumn: 'w-12 sm:w-20', messageColumn: 'msg-with-2xl-avatar' },
  '3xl': { avatarColumn: 'w-16 sm:w-24', messageColumn: 'msg-with-3xl-avatar' },
}

export const avatarSizesCircle: Record<
  AvatarSize,
  { avatarColumn: string; messageColumn: string }
> = {
  xs: { ...avatarSizes.xs, avatarColumn: avatarSizes.xs.avatarColumn + ' h-6 sm:h-6' },
  sm: { ...avatarSizes.sm, avatarColumn: avatarSizes.sm.avatarColumn + ' h-8 sm:h-8' },
  md: { ...avatarSizes.md, avatarColumn: avatarSizes.md.avatarColumn + ' h-8 sm:h-10' },
  lg: { ...avatarSizes.lg, avatarColumn: avatarSizes.lg.avatarColumn + ' h-8 sm:h-12' },
  xl: { ...avatarSizes.xl, avatarColumn: avatarSizes.xl.avatarColumn + ' h-10 sm:h-16' },
  '2xl': { ...avatarSizes['2xl'], avatarColumn: avatarSizes['2xl'].avatarColumn + ' h-12 sm:h-20' },
  '3xl': { ...avatarSizes['3xl'], avatarColumn: avatarSizes['3xl'].avatarColumn + ' h-16 sm:h-24' },
}
