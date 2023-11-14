import { Component, createSignal } from 'solid-js'
import Select from '../../../shared/Select'
import TextInput from '../../../shared/TextInput'
import { userStore } from '../../../store'
import Button from '../../../shared/Button'
import { ThirdPartyFormat } from '/common/adapters'

const KoboldAISettings: Component = () => {
  const state = userStore()
  const [format, setFormat] = createSignal(state.user?.thirdPartyFormat)

  return (
    <>
      <TextInput
        fieldName="koboldUrl"
        label="Kobold-compatible or 3rd-party URL"
        helperText="Fully qualified URL. Typically for Kobold, Textgen, Llama.cpp, or OpenAI compatible APIs. This URL must be publicly accessible."
        placeholder="E.g. https://local-tunnel-url-10-20-30-40.loca.lt"
        value={state.user?.koboldUrl}
      />
      <Select
        fieldName="thirdPartyFormat"
        label="Kobold / 3rd-party Format"
        helperText="Re-formats the prompt to the desired output format."
        items={[
          { label: 'None', value: '' },
          { label: 'Kobold', value: 'kobold' },
          { label: 'OpenAI', value: 'openai' },
          { label: 'OpenAI (Chat Format)', value: 'openai-chat' },
          { label: 'Claude', value: 'claude' },
          { label: 'Textgen (Ooba)', value: 'ooba' },
          { label: 'Llama.cpp', value: 'llamacpp' },
          { label: 'ExLlamaV2', value: 'exllamav2' },
          { label: 'KoboldCpp', value: 'koboldcpp' },
        ]}
        value={format() ?? 'kobold'}
        onChange={(ev) => setFormat(ev.value as ThirdPartyFormat)}
      />
      <TextInput
        fieldName="thirdPartyPassword"
        label="3rd-party password if applicable"
        helperText="(NEVER put an OpenAI API key here, this would expose your personal information to third parties)"
        placeholder={state.user?.thirdPartyPasswordSet ? 'Password is set' : 'E.g. p4ssw0rd123'}
        type="password"
        value={''}
      />
      <Button schema="red" class="w-max" onClick={() => userStore.deleteKey('third-party')}>
        Delete third-party password
      </Button>
    </>
  )
}

export default KoboldAISettings
