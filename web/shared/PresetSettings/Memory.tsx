import { Component } from 'solid-js'
import RangeInput from '../RangeInput'
import { PresetTabProps } from '/web/store/preset-context'

export const MemorySettings: Component<PresetTabProps> = (props) => {
  return (
    <div class="flex flex-col gap-4" classList={{ hidden: props.tab !== 'Memory' }}>
      <div class="flex flex-col gap-2">
        <RangeInput
          fieldName="memoryContextLimit"
          label="Memory: Context Limit"
          helperText="The maximum context budget (in tokens) for the memory book."
          min={1}
          max={2000}
          step={1}
          value={props.state.memoryContextLimit ?? 500}
          disabled={props.state.disabled}
          onChange={(ev) => props.setters.setState('memoryContextLimit', ev)}
        />

        <RangeInput
          fieldName="memoryChatEmbedLimit"
          label="Memory: Long-term Memory Context Budget"
          helperText="If available: The maximum context budget (in tokens) for long-term memory."
          min={1}
          max={10000}
          step={1}
          value={props.state.memoryChatEmbedLimit ?? 500}
          disabled={props.state.disabled}
          onChange={(ev) => props.setters.setState('memoryChatEmbedLimit', ev)}
        />

        <RangeInput
          fieldName="memoryUserEmbedLimit"
          label="Memory: Embedding Context Budget"
          helperText="If available: The maximum context budget (in tokens) for document embeddings."
          min={1}
          max={10000}
          step={1}
          value={props.state.memoryUserEmbedLimit ?? 500}
          disabled={props.state.disabled}
          onChange={(ev) => props.setters.setState('memoryUserEmbedLimit', ev)}
        />

        <RangeInput
          fieldName="memoryDepth"
          label="Memory: Chat History Depth"
          helperText="Number of messages to scan in chat history to scan for memory book keywords."
          min={1}
          max={100}
          step={1}
          value={props.state.memoryDepth || 50}
          disabled={props.state.disabled}
          onChange={(ev) => props.setters.setState('memoryDepth', ev)}
        />
      </div>
    </div>
  )
}
