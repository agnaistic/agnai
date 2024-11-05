import { Component } from 'solid-js'
import { userStore } from '../../../store'
import TextInput from '../../../shared/TextInput'
import Button from '../../../shared/Button'
import { AppSchema } from '/common/types/index'
import { SetStoreFunction } from 'solid-js/store'

const ElevenLabsSettings: Component<{
  state: AppSchema.User
  setter: SetStoreFunction<AppSchema.User>
}> = (props) => {
  return (
    <>
      <div class="text-xl">11ElevenLabs</div>

      <TextInput
        label="ElevenLabs API Key"
        placeholder={
          props.state.elevenLabsApiKeySet || props.state.elevenLabsApiKey
            ? 'ElevenLabs API key is set'
            : 'E.g. q1h66jyatguvhcglabosuywp1dc6blvg'
        }
        type="password"
        value={props.state.elevenLabsApiKey}
        onChange={(ev) => props.setter('elevenLabsApiKey', ev.currentTarget.value)}
      />

      <Button schema="red" class="w-max" onClick={() => userStore.deleteKey('elevenlabs')}>
        Delete ElevenLabs API Key
      </Button>
    </>
  )
}

export default ElevenLabsSettings
