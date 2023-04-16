import { Component } from 'solid-js'
import Select from '../../../shared/Select'
import TextInput from '../../../shared/TextInput'
import { userStore } from '../../../store'

const KoboldAISettings: Component = () => {
  const state = userStore()

  return (
    <>
      <TextInput
        fieldName="koboldUrl"
        label="Kobold-compatible / 3rd-party URL"
        helperText="Fully qualified URL. Typically for Kobold. This URL must be publicly accessible."
        placeholder="E.g. https://local-tunnel-url-10-20-30-40.loca.lt"
        value={state.user?.koboldUrl}
      />

      <Select
        fieldName="thirdPartyFormat"
        label="Kobold / 3rd-party Format"
        helperText="Re-formats the prompt to the desired output format."
        items={[
          { label: 'Kobold', value: 'kobold' },
          { label: 'OpenAI', value: 'openai' },
          { label: 'Claude', value: 'claude' },
        ]}
        value={state.user?.thirdPartyFormat}
      />
    </>
  )
}

export default KoboldAISettings
