import { Component } from 'solid-js'
import TextInput from '../../../shared/TextInput'
import { userStore } from '../../../store'
import Button from '../../../shared/Button'

const ClaudeSettings: Component = () => {
  const state = userStore()
  return (
    <>
      <TextInput
        fieldName="claudeApiKey"
        label="Claude Key"
        helperText="Valid Claude Key."
        placeholder={
          state.user?.claudeApiKeySet
            ? 'Claude key is set'
            : 'E.g. sk-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'
        }
        type="password"
        value={state.user?.claudeApiKey}
      />
      <Button schema="red" class="w-max" onClick={() => userStore.deleteKey('claude')}>
        Delete Claude Key
      </Button>
    </>
  )
}

export default ClaudeSettings
