import { Component, createMemo, createSignal, JSX, Show } from 'solid-js'
import { ThemeColor } from '/common/types/ui'
import { getRgbaFromVar, getRootRgb } from './colors'
import { X } from 'lucide-solid'
import { UserType } from '/common/types/admin'
import { getStore } from '../store/create'

export const CallToAction: Component<{
  targets?: UserType | UserType[]
  title: string
  content: string | JSX.Element
  theme: ThemeColor | 'hl' | 'bg'
  dismissable: boolean
}> = (props) => {
  const [open, setOpen] = createSignal(true)
  const user = getStore('user')()

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
      <div class="w-full px-2">
        <div
          class="relative flex w-full flex-col items-center justify-center rounded-md"
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
          <div class="text-md">{props.content}</div>
        </div>
      </div>
    </Show>
  )
}
