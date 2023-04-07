import { Component } from 'solid-js'
import TextInput from '../../../shared/TextInput'
import { userStore } from '../../../store'

const KoboldAISettings: Component = () => {
  const state = userStore()

  return (
    <>
      <TextInput
        fieldName="koboldUrl"
        label="Kobold Compatible URL"
        helperText="Fully qualified URL. This URL must be publicly accessible."
        placeholder="E.g. https://local-tunnel-url-10-20-30-40.loca.lt"
        value={state.user?.koboldUrl}
      />
    </>
  )
}

export default KoboldAISettings
