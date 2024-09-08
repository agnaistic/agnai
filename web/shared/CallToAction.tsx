import { Component, createMemo, createSignal, JSX, Show } from 'solid-js'
import { ThemeColor } from '/common/types/ui'
import { getRgbaFromVar, getRootRgb } from './colors'
import { X } from 'lucide-solid'
import { UserType } from '/common/types/admin'
import { userStore } from '../store'

export const CallToAction: Component<{
  targets?: UserType | UserType[]
  title?: string
  class?: string
  content?: string | JSX.Element
  theme: ThemeColor | 'hl' | 'bg'
  dismissable?: boolean
  children?: JSX.Element
  width?: 'full' | 'fit'
}> = (props) => {
  const [open, setOpen] = createSignal(true)
  const user = userStore()

  const canShow = createMemo(() => {
    if (!props.targets || props.targets === 'all') return true
    if (!user.userType) return false

    if (typeof props.targets === 'string') {
      return props.targets === user.userType
    }

    return props.targets.includes(user.userType)
  })

  const bg = createMemo(() => getRgbaFromVar(`${props.theme}-700`, 1))
  const border = createMemo(() => `1px solid rgb(${getRootRgb(`${props.theme}-400`).rgb})`)

  return (
    <Show when={canShow() && open()}>
      <div class={`flex w-full justify-center px-2 ${props.class || ''}`}>
        <div
          class="relative flex flex-col items-center justify-center rounded-md py-1 pl-2"
          classList={{
            'w-full': props.width === 'full' || !props.width,
            'w-fit': props.width === 'fit',
            'pr-8': props.dismissable,
            'pr-2': !props.dismissable,
          }}
          style={{ background: bg().background, border: border() }}
        >
          <Show when={props.dismissable}>
            <div class="icon-button absolute right-2 top-1" onClick={() => setOpen(false)}>
              <X />
            </div>
          </Show>
          <Show when={props.title}>
            <div class="text-lg font-bold">{props.title}</div>
          </Show>
          <div class="text-md">{props.content || props.children}</div>
        </div>
      </div>
    </Show>
  )
}
