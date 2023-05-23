import { Component } from 'solid-js'
import TextInput from '/web/shared/TextInput'
import { userStore } from '/web/store'

const SileroApiServerSettings: Component = () => {
  const state = userStore()

  return (
    <>
      <div class="text-xl">Silero API Server</div>

      <div class="italic">
        <a href="https://github.com/ouoertheo/silero-api-server/">
          Install instructions for silero-api-server on GitHub
        </a>
      </div>

      <TextInput
        fieldName="sileroApiServerUrl"
        label="Silero API Server URL"
        placeholder="http://localhost:8001/"
        value={state.user?.sileroApiServerUrl ?? ''}
      />
    </>
  )
}

export default SileroApiServerSettings
