import { Bot, VenetianMask } from 'lucide-solid'
import {
  Component,
  createEffect,
  createMemo,
  createSignal,
  JSX,
  Match,
  Show,
  Switch,
} from 'solid-js'
import { settingStore } from '../store'
import { getAssetUrl } from './util'
import './avatar.css'
import { LucideProps } from 'lucide-solid/dist/types/types'
import { getImageData } from '../store/data/chars'
import { AppSchema, UI } from '/common/types'
import AvatarContainer from './Avatar/Container'
import { FullSprite } from '/common/types/sprite'

type Props = {
  visual?: string
  sprite?: FullSprite
  avatarUrl?: string | File
  class?: string
  bot?: boolean
  format?: Format
  anonymize?: boolean
  Icon?: (props: LucideProps) => JSX.Element
  openable?: boolean
}

type Format = {
  size: UI.AvatarSize
  corners: UI.AvatarCornerRadius
}

const defaultFormat: Format = { size: 'md', corners: 'circle' }

export const CharacterAvatar: Component<{
  char: AppSchema.Character
  openable?: boolean
  format?: Format
  bot?: boolean
  anonymize?: boolean
  surround?: boolean
  class?: string
  zoom?: number
  Icon?: (props: LucideProps) => JSX.Element
}> = (props) => {
  let ref: any
  const format = createMemo(() => props.format || defaultFormat)

  const fmtSize = createMemo(() => {
    return `avatar-${format().size} ${format().corners === 'circle' ? 'avatar-circle' : ''}`
  })

  const fmtCorners = createMemo(() => corners[format().corners])

  return (
    <>
      <Switch>
        <Match when={!!props.Icon}>
          <AvatarIcon format={props.format} Icon={props.Icon} bot={props.bot} />
        </Match>

        <Match when={!props.char}>
          <AvatarIcon bot={props.bot} format={props.format} />
        </Match>

        <Match when={props.char.visualType === 'sprite' && props.char.sprite && props.surround}>
          <div
            ref={ref}
            class={`flex justify-center overflow-hidden border-2 border-[var(--bg-800)] bg-[var(--bg-800)]  ${fmtSize()} ${fmtCorners()} shrink-0 ${
              props.class || ''
            }`}
            data-bot-avatar={props.bot}
            data-user-avatar={!props.bot}
          >
            <AvatarContainer body={props.char.sprite} container={ref} zoom={props.zoom} />
          </div>
        </Match>

        <Match when={props.char.visualType === 'sprite' && props.char.sprite}>
          <div
            class={`flex justify-center avatar-${
              props.format?.size || 'md'
            } avatar-circle ${fmtCorners()}`}
            ref={ref}
          >
            <AvatarContainer zoom={props.zoom} body={props.char.sprite} container={ref} />
          </div>
        </Match>

        <Match when>
          <AvatarIcon
            visual={props.char.visualType}
            sprite={props.char.sprite}
            avatarUrl={props.char.avatar || ''}
            openable={props.openable}
            format={props.format}
            bot={props.bot}
            anonymize={props.anonymize}
          />
        </Match>
      </Switch>
    </>
  )
}

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
    if (!props.avatarUrl) {
      setAvatar('')
      return
    }
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
      <Switch>
        <Match when={avatar()}>
          <div
            class={`avatar-icon overflow-hidden border-2 border-[var(--bg-800)]  ${fmtSize()} ${fmtCorners()} shrink-0 ${
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
        </Match>

        <Match when>
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
        </Match>
      </Switch>
    </>
  )
}

const fit: Record<UI.AvatarCornerRadius, string> = {
  sm: 'object-cover sm:object-scale-down',
  md: 'object-cover sm:object-scale-down',
  lg: 'object-cover sm:object-scale-down',
  circle: 'object-cover sm:object-cover',
  none: 'object-cover sm:object-scale-down',
}

const corners: Record<UI.AvatarCornerRadius, string> = {
  sm: 'rounded-sm sm:rounded-sm',
  md: 'rounded-md sm:rounded-md',
  lg: 'rounded-lg sm:rounded-lg',
  circle: 'rounded-full sm:rounded-full',
  none: '',
}

export default AvatarIcon
