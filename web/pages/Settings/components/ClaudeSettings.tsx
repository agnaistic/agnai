import { Component } from 'solid-js'
import TextInput from '../../../shared/TextInput'
import { userStore } from '../../../store'
import Button from '../../../shared/Button'
import { SetStoreFunction } from 'solid-js/store'
import { UserSettings } from '../util'

const ClaudeSettings: Component<{
  state: UserSettings
  setter: SetStoreFunction<UserSettings>
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
