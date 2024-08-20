import { Component } from 'solid-js'
import { Card } from '../Card'
import RangeInput from '../RangeInput'
import { PresetProps } from './types'
import { ThirdPartyFormat } from '/common/adapters'
import { defaultPresets } from '/common/default-preset'
import { AppSchema } from '/common/types'

export const MemorySettings: Component<
  PresetProps & {
    pane: boolean
    format?: ThirdPartyFormat
    tab: string
    sub?: AppSchema.SubscriptionModelOption
  }
> = (props) => {
  return (
    <div class="flex flex-col gap-4" classList={{ hidden: props.tab !== 'Memory' }}>
      <Card class="flex flex-col gap-2">
        <RangeInput
          fieldName="memoryContextLimit"
          label="Memory: Context Limit"
          helperText="The maximum context budget (in tokens) for the memory book."
          min={1}
          max={2000}
          step={1}
          value={props.inherit?.memoryContextLimit || defaultPresets.basic.memoryContextLimit}
          disabled={props.disabled}
        />

        <RangeInput
          fieldName="memoryChatEmbedLimit"
          label="Memory: Long-term Memory Context Budget"
          helperText="If available: The maximum context budget (in tokens) for long-term memory."
          min={1}
          max={10000}
          step={1}
          value={props.inherit?.memoryChatEmbedLimit || defaultPresets.basic.memoryContextLimit}
          disabled={props.disabled}
        />

        <RangeInput
          fieldName="memoryUserEmbedLimit"
          label="Memory: Embedding Context Budget"
          helperText="If available: The maximum context budget (in tokens) for document embeddings."
          min={1}
          max={10000}
          step={1}
          value={props.inherit?.memoryUserEmbedLimit || defaultPresets.basic.memoryContextLimit}
          disabled={props.disabled}
        />

        <RangeInput
          fieldName="memoryDepth"
          label="Memory: Chat History Depth"
          helperText="Number of messages to scan in chat history to scan for memory book keywords."
          min={1}
          max={100}
          step={1}
          value={props.inherit?.memoryDepth || defaultPresets.basic.memoryDepth}
          disabled={props.disabled}
        />
      </Card>
    </div>
  )
}
