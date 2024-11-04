import { Component } from 'solid-js'
import TextInput from '../../../shared/TextInput'
import Button from '../../../shared/Button'
import { SetStoreFunction } from 'solid-js/store'
import { AppSchema } from '/common/types/index'
import { userStore } from '/web/store/user'

const OpenAISettings: Component<{
  state: AppSchema.User
  setter: SetStoreFunction<AppSchema.User>
}> = (props) => {
  return (
    <>
      <TextInput
        fieldName="oaiKey"
        label="OpenAI Key"
        helperText={<>Valid OpenAI Key. </>}
        placeholder={
          props.state.oaiKeySet || props.state.oaiKey
            ? 'OpenAI key is set'
            : 'E.g. sk-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'
        }
        type="password"
        value={props.state.oaiKey}
        onChange={(ev) => props.setter('oaiKey', ev.currentTarget.value)}
      />
      <Button schema="red" class="w-max" onClick={() => userStore.deleteKey('openai')}>
        Delete OpenAI Key
      </Button>
    </>
  )
}

export default OpenAISettings
