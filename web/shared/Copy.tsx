import { ClipboardCheck, ClipboardCopy } from 'lucide-solid'
import { Component, createSignal, Match, Switch } from 'solid-js'

export const Copy: Component<{ text: string; size?: number }> = (props) => {
  const [clicked, setClicked] = createSignal(false)

  const copy = () => {
    setTimeout(() => setClicked(false), 1000)
    navigator.clipboard.writeText(props.text)
    setClicked(true)
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
