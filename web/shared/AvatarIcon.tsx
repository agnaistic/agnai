import { Bot, VenetianMask } from 'lucide-solid'
import { Component, createEffect, createMemo, createSignal, JSX, Show } from 'solid-js'
import { AvatarCornerRadius, AvatarSize, settingStore } from '../store'
import { getAssetUrl } from './util'
import './avatar.css'
import { LucideProps } from 'lucide-solid/dist/types/types'
import { getImageData } from '../store/data/chars'

type Props = {
  avatarUrl?: string | File
  class?: string
  bot?: boolean
  format?: Format
  anonymize?: boolean
  Icon?: (props: LucideProps) => JSX.Element
  openable?: boolean
}

type Format = {
  size: AvatarSize
  corners: AvatarCornerRadius
}

const defaultFormat: Format = { size: 'md', corners: 'circle' }

const AvatarIcon: Component<Props> = (props) => {
  const [avatar, setAvatar] = createSignal(
    typeof props.avatarUrl === 'string' ? props.avatarUrl : null
  )
  const cls = createMemo(() => props.class || '')

  const format = createMemo(() => props.format || defaultFormat)

  const fmtFit = createMemo(() => fit[format().corners])
  const fmtSize = createMemo(() => {
    return `avatar-${format().size} ${format().corners === 'circle' ? 'avatar-circle' : ''}`
  })

  const fmtCorners = createMemo(() => corners[format().corners])

  createEffect(async () => {
    if (!props.avatarUrl) return
    if (props.avatarUrl instanceof File) {
      const data = await getImageData(props.avatarUrl)
      setAvatar(data!)
    } else {
      setAvatar(props.avatarUrl)
    }
  })

  // We don't simply remove or change the image, because
  // this would cause a DOM shift (bad UX). If the user's avatar is tall,
  // replacing it with the default round avatar would cause long messages to
  // shrink.
  const visibilityClass = () => (props.anonymize ? 'invisible' : '')

  const onImageClick = () => {
    if (!props.openable) return
    const img = avatar()
    if (!img) return
    settingStore.showImage(img)
  }

  return (
    <>
      <Show when={avatar()}>
        <div
          class={`overflow-hidden border-2 border-[var(--bg-800)] bg-[var(--bg-700)] ${fmtSize()} ${fmtCorners()} shrink-0 ${
            props.class || ''
          }`}
          data-bot-avatar={props.bot}
          data-user-avatar={!props.bot}
          onClick={onImageClick}
        >
          <img
            data-bot-image={props.bot}
            data-user-image={!props.bot}
            class={`
              m-auto
              ${format().corners === 'circle' ? fmtSize() : 'max-h-full max-w-full'}
              ${fmtFit()} ${fmtCorners()}
              ${visibilityClass()}
            `}
            src={getAssetUrl(avatar()!)}
            data-bot-avatar={props.bot}
          />
        </div>
      </Show>
      <Show when={!avatar()}>
        <div
          data-bot-avatar={props.bot}
          data-user-avatar={!props.bot}
          class={`avatar-${
            format().size
          } avatar-circle flex shrink-0 items-center justify-center rounded-full border-2 border-[var(--bg-800)] bg-[var(--bg-700)] ${cls()}`}
        >
          <Show when={!props.bot}>
            <VenetianMask data-user-icon />
          </Show>
          <Show when={props.bot}>
            <Show when={props.Icon}>{props.Icon && <props.Icon data-bot-icon />}</Show>
            <Show when={!props.Icon}>
              <Bot data-bot-icon />
            </Show>
          </Show>
        </div>
      </Show>
    </>
  )
}

const fit: Record<AvatarCornerRadius, string> = {
  sm: 'object-cover sm:object-scale-down',
  md: 'object-cover sm:object-scale-down',
  lg: 'object-cover sm:object-scale-down',
  circle: 'object-cover sm:object-cover',
  none: 'object-cover sm:object-scale-down',
}

const corners: Record<AvatarCornerRadius, string> = {
  sm: 'rounded-sm sm:rounded-sm',
  md: 'rounded-md sm:rounded-md',
  lg: 'rounded-lg sm:rounded-lg',
  circle: 'rounded-full sm:rounded-full',
  none: '',
}

export default AvatarIcon
