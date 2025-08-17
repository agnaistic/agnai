import { ClipboardCheck, ClipboardCopy } from 'lucide-solid'
import { Component, createSignal, Match, Show, Switch } from 'solid-js'
import { RelativeSpinner } from './Loading'

/**
 *
 * @param props
 * @returns
 */
export const Copy: Component<{
  children?: any
  text: string
  size?: number
  onClick?: () => Promise<string>
}> = (props) => {
  const [loading, setLoading] = createSignal(false)
  const [clicked, setClicked] = createSignal(false)

  const copy = async () => {
    setClicked(true)

    try {
      if (props.onClick) {
        setLoading(true)
      }
      const text = props.onClick ? await props.onClick?.() : props.text
      navigator.clipboard.writeText(text)
    } finally {
      setLoading(false)
      setTimeout(() => setClicked(false), 1000)
    }
  }

  return (
    <div onClick={copy} class="icon-button cursor-pointer font-normal">
      <Switch>
        <Match when={loading()}>
          <RelativeSpinner size={props.size ?? 20} />
        </Match>

        <Match when={!clicked()}>
          <Show when={props.children} fallback={<ClipboardCopy size={props.size ?? 20} />}>
            {props.children}
          </Show>
        </Match>

        <Match when>
          <ClipboardCheck size={props.size ?? 20} />
        </Match>
      </Switch>
    </div>
  )
}
