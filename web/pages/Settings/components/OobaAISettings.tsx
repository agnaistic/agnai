import { Component } from 'solid-js'
import TextInput from '../../../shared/TextInput'
import { SetStoreFunction } from 'solid-js/store'
import { AppSchema } from '/common/types/index'

const OobaAISettings: Component<{
  state: AppSchema.User
  setter: SetStoreFunction<AppSchema.User>
}> = (props) => {
  return (
    <>
      <TextInput
        fieldName="oobaUrl"
        label="Text-Generation-WebUI Compatible URL"
        helperText="This URL must be publicly accessible. Overriden by 'Third Party URL' in presets."
        placeholder="E.g. https://random-cloudflare-generated-words.trycloudflare.com"
        value={props.state.oobaUrl}
        onChange={(ev) => props.setter('oobaUrl', ev.currentTarget.value)}
      />
    </>
  )
}

export default OobaAISettings
