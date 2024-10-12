import { Component, Match, Switch } from 'solid-js'
import { CharEditor } from '../editor'
import Tooltip from '/web/shared/Tooltip'
import { WandSparkles } from 'lucide-solid'
import Button from '/web/shared/Button'
import { toastStore } from '/web/store/toasts'

export const Regenerate: Component<{
  field: string
  trait?: string
  editor: CharEditor
  allowed: boolean
  class?: string
}> = (props) => {
  return (
    <Tooltip
      tip="Name and description must be filled"
      position="right"
      disable={props.editor.canGenerate()}
    >
      <Switch>
        <Match when={!props.allowed}>{null}</Match>

        <Match when={props.allowed}>
          <Button
            size="sm"
            class={`inline-block ${props.class || ''}`}
            onClick={() => {
              if (!props.editor.canGenerate()) {
                toastStore.warn(`Fill in the Name and Description to generate`)
                return
              }
              props.editor.generateField(props.field, props.trait)
            }}
            disabled={props.editor.generating()}
          >
            <WandSparkles size={16} />
          </Button>
        </Match>
      </Switch>
    </Tooltip>
  )
}
