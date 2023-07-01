import { UserState, userStore } from '../../store'
import { UI } from '/common/types'

/* Magic strings for dev testing purposes. */

const devCommands = {
  '/devCycleAvatarSettings': true,
  '/devShowOocToggle': true,
  '/devShowHiddenEvents': true,
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
  const testedCornerSettings: UI.AvatarCornerRadius[] = ['md', 'circle']
  const settingPermutations = testedCornerSettings.flatMap((avatarCorners) =>
    UI.AVATAR_SIZES.map((avatarSize) => ({ avatarCorners, avatarSize }))
  )
  const applyPermutations = ([perm, ...rest]: typeof settingPermutations) => {
    if (perm === undefined) {
      console.log('Done demonstrating avatar setting permutations, restoring original settings')
      const { avatarCorners, avatarSize } = originalSettings
      userStore.saveUI({ avatarCorners, avatarSize })
    } else {
      console.log(perm)
      const { avatarCorners, avatarSize } = perm
      userStore.saveUI({ avatarCorners, avatarSize })
      setTimeout(() => applyPermutations(rest), 800)
    }
  }
  applyPermutations(settingPermutations)
}
