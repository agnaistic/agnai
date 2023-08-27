import { Component } from 'solid-js'
import TextInput from '../../../shared/TextInput'
import { userStore } from '../../../store'

const OobaAISettings: Component = () => {
  const state = userStore()

  return (
    <>
      <TextInput
        fieldName="oobaUrl"
        label="Text-Generation-WebUI Compatible URL"
        helperText="This URL must be publicly accessible. Overriden by 'Third Party URL' in presets."
        placeholder="E.g. https://random-cloudflare-generated-words.trycloudflare.com"
        value={state.user?.oobaUrl}
      />
    </>
  )
}

export default OobaAISettings
