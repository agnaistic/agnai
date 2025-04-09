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
    <div onClick={copy} class="cursor-pointer">
      <Switch>
        <Match when={!clicked()}>
          <ClipboardCopy size={props.size} />
        </Match>
        <Match when>
          <ClipboardCheck size={props.size} />
        </Match>
      </Switch>
    </div>
  )
}
