import { Check, Info, X } from 'lucide-solid'
import { For, JSX, Show } from 'solid-js'
import { AIAdapter } from '/common/adapters'
import Tooltip from './Tooltip'

export const SupportedAdaptersTooltip = (props: { service?: AIAdapter; adapters?: string[] }) => {
  return (
    <>
      <Show when={props.adapters}>
        <Tooltip tip={CreateSupportedAdaptersTooltip(props.adapters!)} position="right">
          <Info size={20} color={'var(--hl-500)'} />
        </Tooltip>
      </Show>
    </>
  )
}

function CreateSupportedAdaptersTooltip(adapters: string[] | readonly string[]): JSX.Element {
  const allAdapaters = ['kobold', 'novel', 'ooba', 'horde', 'luminai', 'openai', 'scale']
  return (
    <div>
      <For each={allAdapaters}>
        {(adapter) => (
          <div class="flex flex-row gap-2">
            <Show when={adapters.includes(adapter)}>
              <div class="text-green-500">
                <Check />
              </div>
            </Show>
            <Show when={!adapters.includes(adapter)}>
              <div class="text-red-500">
                <X />
              </div>
            </Show>
            {adapter}
          </div>
        )}
      </For>
    </div>
  )
}
