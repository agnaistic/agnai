import { Component } from 'solid-js'
import TextInput from '../../../shared/TextInput'
import { userStore } from '../../../store'
import Button from '../../../shared/Button'
import { SetStoreFunction } from 'solid-js/store'
import { AppSchema } from '/common/types/index'

const ClaudeSettings: Component<{
  state: AppSchema.User
  setter: SetStoreFunction<AppSchema.User>
}> = (props) => {
  return (
    <>
      <TextInput
        label="Claude Key"
        helperText="Valid Claude Key."
        placeholder={
          props.state.claudeApiKeySet
            ? 'Claude key is set'
            : 'E.g. sk-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'
        }
        type="password"
        value={props.state.claudeApiKey}
        onChange={(ev) => props.setter('claudeApiKey', ev.currentTarget.value)}
      />
      <Button schema="red" class="w-max" onClick={() => userStore.deleteKey('claude')}>
        Delete Claude Key
      </Button>
    </>
  )
}

export default ClaudeSettings
