import { Component } from 'solid-js'
import TextInput from '../../../shared/TextInput'
import { userStore } from '../../../store'
import Button from '../../../shared/Button'

const MistralSettings: Component = () => {
  const state = userStore()
  return (
    <>
      <TextInput
        fieldName="mistralApiKey"
        label="Mistral Key"
        helperText="Valid Mistral Key."
        placeholder={
          state.user?.mistralApiKey
            ? 'Mistral key is set'
            : 'E.g. XXXXXXXXXXXXXXXXXXXXXX'
        }
        type="password"
        value={state.user?.mistralApiKey}
      />
      <Button schema="red" class="w-max" onClick={() => userStore.deleteKey('mistral')}>
        Delete Mistral Key
      </Button>
    </>
  )
}

export default MistralSettings