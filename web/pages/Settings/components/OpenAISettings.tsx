import { Component } from 'solid-js'
import TextInput from '../../../shared/TextInput'
import { userStore } from '../../../store'
import Button from '../../../shared/Button'

const OpenAISettings: Component = () => {
  const state = userStore()

  return (
    <>
      <TextInput
        fieldName="oaiKey"
        label="OpenAI Key"
        helperText={<>Valid OpenAI Key. </>}
        placeholder={
          state.user?.oaiKeySet || state.user?.oaiKey
            ? 'OpenAI key is set'
            : 'E.g. sk-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'
        }
        type="password"
        value={''}
      />
      <Button schema="red" class="w-max" onClick={() => userStore.deleteKey('openai')}>
        Delete OpenAI Key
      </Button>
    </>
  )
}

export default OpenAISettings
