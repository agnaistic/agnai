import { ClipboardCheck, ClipboardCopy } from 'lucide-solid'
import { Component, createSignal, Match, Switch } from 'solid-js'

/**
 *
 * @param props
 * @returns
 */
export const Copy: Component<{ text: string; size?: number; onClick?: () => Promise<string> }> = (
  props
) => {
  const [clicked, setClicked] = createSignal(false)

  const copy = async () => {
    setClicked(true)

    try {
      const text = props.onClick ? await props.onClick?.() : props.text
      navigator.clipboard.writeText(text)
    } finally {
      setTimeout(() => setClicked(false), 1000)
    }
  }

  return (
    <div onClick={copy} class="icon-button cursor-pointer font-normal">
      <Switch>
        <Match when={!clicked()}>
          <ClipboardCopy size={props.size ?? 20} />
        </Match>
        <Match when>
          <ClipboardCheck size={props.size ?? 20} />
        </Match>
      </Switch>
    </div>
  )
}
