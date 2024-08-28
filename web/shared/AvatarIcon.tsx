import { Bot, VenetianMask } from 'lucide-solid'
import { Component, createEffect, createSignal, JSX, Match, Show, Switch } from 'solid-js'
import { settingStore } from '../store'
import { getAssetUrl } from './util'
import './avatar.css'
import { LucideProps } from 'lucide-solid/dist/types/types'
import { AppSchema, UI } from '/common/types'
import AvatarContainer from './Avatar/Container'
import { FullSprite } from '/common/types/sprite'
import { imageApi } from '../store/data/image'

type Props = {
  visual?: string
  sprite?: FullSprite
  avatarUrl?: string | File
  class?: string
  bot?: boolean
  format: Format
  anonymize?: boolean
  Icon?: (props: LucideProps) => JSX.Element
  openable?: boolean
  noBorder?: boolean
}

type Format = {
  size: UI.AvatarSize
  corners: UI.AvatarCornerRadius
}

export const CharacterAvatar: Component<{
  noBorder?: boolean
  char: AppSchema.Character
  openable?: boolean
  format: Format
  bot?: boolean
  anonymize?: boolean
  surround?: boolean
  class?: string
  zoom?: number
  Icon?: (props: LucideProps) => JSX.Element
}> = (props) => {
  let ref: any

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
            class={`flex shrink-0 justify-center overflow-hidden border-2 bg-[var(--bg-800)] ${
              props.class || ''
            }`}
            classList={{
              [corners[props.format.corners]]: true,
              [`avatar-${props.format.size}`]: true,
              'avatar-circle': props.format.corners === 'circle',
              'border-2': !props.noBorder,
              'border-[var(--bg-800)]': !props.noBorder,
              'border-0': props.noBorder,
            }}
            data-bot-avatar={props.bot}
            data-user-avatar={!props.bot}
          >
            <AvatarContainer body={props.char.sprite} container={ref} zoom={props.zoom} />
          </div>
        </Match>

        <Match when={props.char.visualType === 'sprite' && props.char.sprite}>
          <div
            classList={{
              [corners[props.format.corners]]: true,
              [`avatar-${props.format.size}`]: true,
            }}
            class={`avatar-circle flex justify-center`}
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

  createEffect(async () => {
    if (!props.avatarUrl) {
      setAvatar('')
      return
    }
    if (props.avatarUrl instanceof File) {
      const data = await imageApi.getImageData(props.avatarUrl)
      setAvatar(data!)
    } else {
      setAvatar(props.avatarUrl)
    }
  })

  const onImageClick = () => {
    if (!props.openable) return
    const img = avatar()
    if (!img) return
    settingStore.showImage(img)
  }

  return (
    <>
      <Switch>
        <Match when={avatar() && !props.anonymize}>
          <div
            class={`avatar-icon shrink-0 overflow-hidden ${props.class || ''}`}
            classList={{
              [corners[props.format.corners]]: true,
              [`avatar-${props.format.size}`]: true,
              'avatar-circle': props.format.corners === 'circle',
              'border-2': !props.noBorder,
              'border-[var(--bg-800)]': !props.noBorder,
              'border-0': props.noBorder,
              visible: props.anonymize,
            }}
            data-bot-avatar={props.bot}
            data-user-avatar={!props.bot}
            onClick={onImageClick}
            aria-hidden="true"
          >
            <img
              data-bot-image={props.bot}
              data-user-image={!props.bot}
              classList={{
                'm-auto': !props.noBorder,
                'avatar-circle': props.format.corners === 'circle',
                [`avatar-${props.format.size}`]: props.format.corners === 'circle',
                'max-h-full max-w-full': props.format.corners !== 'circle',
                [fit[props.format.corners]]: true,
                [corners[props.format.corners]]: true,
              }}
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
              props.format.size
            } avatar-circle flex shrink-0 items-center justify-center rounded-full bg-[var(--bg-700)] ${
              props.class || ''
            }`}
            classList={{
              'border-2': !props.noBorder,
              'border-[var(--bg-800)]': !props.noBorder,
              'border-0': props.noBorder,
            }}
            aria-hidden="true"
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
