import { AvatarCornerRadius, AVATAR_SIZES, UserState, userStore } from '../../store'

/* Magic strings for dev testing purposes. */

const devCommands = {
  '/devCycleAvatarSettings': true,
  '/devShowOocToggle': true,
}

type DevCommand = keyof typeof devCommands

export function isDevCommand(value: string): value is DevCommand {
  return value in devCommands
}

export function devCycleAvatarSettings(user: UserState) {
  const originalSettings = {
    avatarCorners: user.ui.avatarCorners,
    avatarSize: user.ui.avatarSize,
  }
  const testedCornerSettings: AvatarCornerRadius[] = ['md', 'circle']
  const settingPermutations = testedCornerSettings.flatMap((avatarCorners) =>
    AVATAR_SIZES.map((avatarSize) => ({ avatarCorners, avatarSize }))
  )
  const applyPermutations = ([perm, ...rest]: typeof settingPermutations) => {
    if (perm === undefined) {
      console.log('Done demonstrating avatar setting permutations, restoring original settings')
      const { avatarCorners, avatarSize } = originalSettings
      userStore.updateUI({ avatarCorners, avatarSize })
    } else {
      console.log(perm)
      const { avatarCorners, avatarSize } = perm
      userStore.updateUI({ avatarCorners, avatarSize })
      setTimeout(() => applyPermutations(rest), 800)
    }
  }
  applyPermutations(settingPermutations)
}
