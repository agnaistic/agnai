import { Component } from 'solid-js'
import Select from '../../../shared/Select'
import TextInput from '../../../shared/TextInput'
import { userStore } from '../../../store'

const KoboldAISettings: Component = () => {
  const state = userStore()

  return (
    <>
      <Select
        fieldName="thirdPartyBackendFormat"
        label="Third party backend format"
        items={[
          { label: 'Kobold', value: 'kobold' },
          { label: 'OpenAI', value: 'openai' },
          { label: 'Claude', value: 'claude' },
        ]}
        value={state.user?.thirdPartyBackendFormat}
      />
      <TextInput
        fieldName="koboldUrl"
        label="Third-party backend URL"
        helperText="Fully qualified URL. This URL must be publicly accessible."
        placeholder="E.g. https://local-tunnel-url-10-20-30-40.loca.lt"
        value={state.user?.koboldUrl}
      />
    </>
  )
}

export default KoboldAISettings
