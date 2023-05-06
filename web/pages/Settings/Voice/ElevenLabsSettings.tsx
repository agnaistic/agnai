import { Component } from 'solid-js'
import { userStore } from '../../../store'
import TextInput from '../../../shared/TextInput'
import Button from '../../../shared/Button'

const ElevenLabsSettings: Component = () => {
  const state = userStore()

  return (
    <>
      <div class="text-xl">11ElevenLabs</div>

      <TextInput
        fieldName="elevenLabsApiKey"
        label="ElevenLabs API Key"
        placeholder={
          state.user?.elevenLabsApiKeySet || state.user?.elevenLabsApiKey
            ? 'ElevenLabs API key is set'
            : 'E.g. q1h66jyatguvhcglabosuywp1dc6blvg'
        }
        type="password"
      />

      <Button schema="red" class="w-max" onClick={() => userStore.deleteKey('elevenlabs')}>
        Delete ElevenLabs API Key
      </Button>
    </>
  )
}

export default ElevenLabsSettings
