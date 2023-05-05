import { Component, Show, createEffect, createSignal } from 'solid-js'
import { userStore } from '../../../store'
import TextInput from '../../../shared/TextInput'
import Button from '../../../shared/Button'
import RangeInput from '../../../shared/RangeInput'
import Select, { Option } from '../../../shared/Select'
import { ElevenLabsModels } from '../../../../srv/db/texttospeech-schema'

const ElevenLabsSettings: Component = () => {
  const state = userStore()

  const [apiKey, setApiKey] = createSignal()

  createEffect(() => {
    setApiKey(state.user?.elevenLabsApiKeySet)
  })

  return (
    <>
      <div class="text-xl">11ElevenLabs</div>

      <TextInput
        fieldName="elevenLabsApiKey"
        label="ElevenLabs API Key"
        placeholder={
          state.user?.elevenLabsApiKeySet
            ? 'ElevenLabs API key is set'
            : 'E.g. q1h66jyatguvhcglabosuywp1dc6blvg'
        }
        type="password"
        value={state.user?.elevenLabsApiKey}
        onChange={(e) => setApiKey(!!e.currentTarget.value)}
      />

      <Button schema="red" class="w-max" onClick={() => userStore.deleteKey('elevenlabs')}>
        Delete ElevenLabs API Key
      </Button>
    </>
  )
}

export default ElevenLabsSettings
