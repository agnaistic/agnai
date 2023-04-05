import { Component } from "solid-js"
import TextInput from "../../../shared/TextInput"
import { settingStore, userStore } from "../../../store"
import Button from "../../../shared/Button"

const OpenAISettings: Component = () => {
  const state = userStore()

  return (
    <>
      <TextInput
        fieldName="oaiKey"
        label="OpenAI Key"
        helperText="Valid OpenAI Key."
        placeholder={
          state.user?.oaiKeySet
            ? 'OpenAI key is set'
            : 'E.g. sk-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'
        }
        type="password"
        value={state.user?.oaiKey}
      />
      <Button schema="red" class="w-max" onClick={() => userStore.deleteKey('openai')}>
        Delete OpenAI Key
      </Button>
    </>
  )
}

export default OpenAISettings
