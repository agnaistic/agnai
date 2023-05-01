import { AvatarSize } from '../store'

// if you change the width values, you must also update Message.css
export const avatarSizes: Record<AvatarSize, { avatar: string; msg: string }> = {
  xs: { avatar: 'avatar-xs', msg: 'msg-with-xs-avatar' },
  sm: { avatar: 'avatar-sm', msg: 'msg-with-sm-avatar' },
  md: { avatar: 'avatar-md', msg: 'msg-with-md-avatar' },
  lg: { avatar: 'avatar-lg', msg: 'msg-with-lg-avatar' },
  xl: { avatar: 'avatar-xl', msg: 'msg-with-xl-avatar' },
  '2xl': { avatar: 'avatar-2xl', msg: 'msg-with-2xl-avatar' },
  '3xl': { avatar: 'avatar-3xl', msg: 'msg-with-3xl-avatar' },
}

export const avatarSizesCircle: Record<AvatarSize, { avatar: string; msg: string }> = {
  xs: { ...avatarSizes.xs, avatar: 'avatar-xs avatar-circle' },
  sm: { ...avatarSizes.sm, avatar: 'avatar-sm avatar-circle' },
  md: { ...avatarSizes.md, avatar: 'avatar-md avatar-circle' },
  lg: { ...avatarSizes.lg, avatar: 'avatar-lg avatar-circle' },
  xl: { ...avatarSizes.xl, avatar: 'avatar-xl avatar-circle' },
  '2xl': { ...avatarSizes['2xl'], avatar: 'avatar-2xl avatar-circle' },
  '3xl': { ...avatarSizes['3xl'], avatar: 'avatar-3xl avatar-circle' },
}
