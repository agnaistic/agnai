import { Bot, VenetianMask } from 'lucide-solid'
import { Component, createMemo, Show } from 'solid-js'
import { AvatarCornerRadius, AvatarSize } from '../store'

type Props = {
  avatarUrl?: string
  class?: string
  bot?: boolean
  format?: Format
}

type Format = {
  size: AvatarSize
  corners: AvatarCornerRadius
}

const defaultFormat: Format = { size: 'md', corners: 'circle' }

const AvatarIcon: Component<Props> = (props) => {
  const cls = createMemo(() => props.class || '')

  const format = createMemo(() => props.format || defaultFormat)

  const fmtFit = createMemo(() => fit[format().corners])
  const fmtSize = createMemo(() =>
    format().corners === 'circle' ? sizesCircle[format().size] : sizes[format().size]
  )
  const fmtCorners = createMemo(() => corners[format().corners])

  return (
    <>
      <Show when={props.avatarUrl}>
        <div
          class={`${fmtSize()} ${fmtCorners()} shrink-0 ${props.class || ''}`}
          data-bot-avatar={props.bot}
          data-user-avatar={!props.bot}
        >
          <img
            data-bot-image={props.bot}
            data-user-image={!props.bot}
            class={`m-auto ${
              format().corners === 'circle' ? fmtSize() : 'max-h-full max-w-full'
            } ${fmtFit()} ${fmtCorners()}`}
            src={props.avatarUrl}
            data-bot-avatar={props.bot}
          />
        </div>
      </Show>
      <Show when={!props.avatarUrl}>
        <div
          data-bot-avatar={props.bot}
          data-user-avatar={!props.bot}
          class={`flex ${fmtSize()} items-center justify-center rounded-full bg-[var(--black-700)] ${cls()}`}
        >
          <Show when={!props.bot}>
            <VenetianMask data-user-icon />
          </Show>
          <Show when={props.bot}>
            <Bot data-bot-icon />
          </Show>
        </div>
      </Show>
    </>
  )
}

const sizes: Record<AvatarSize, string> = {
  sm: 'w-8 sm:w-8',
  md: 'w-8 sm:w-10',
  lg: 'w-8 sm:w-12',
  xl: 'w-10 sm:w-16',
  '2xl': 'w-12 sm:w-20',
  '3xl': 'w-16 sm:w-24',
}

const sizesCircle: Record<AvatarSize, string> = {
  sm: sizes.sm + ' h-8 sm:h-8',
  md: sizes.md + ' h-8 sm:h-10',
  lg: sizes.lg + ' h-8 sm:h-12',
  xl: sizes.xl + ' h-10 sm:h-16',
  '2xl': sizes['2xl'] + ' h-12 sm:h-20',
  '3xl': sizes['3xl'] + ' h-16 sm:h-24',
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
