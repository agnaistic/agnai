import { Component } from 'solid-js'
import TextInput from '../../../shared/TextInput'
import { userStore } from '../../../store'
import Button from '../../../shared/Button'
import { SetStoreFunction } from 'solid-js/store'
import { AppSchema } from '/common/types/index'

const ScaleSettings: Component<{
  state: AppSchema.User
  setter: SetStoreFunction<AppSchema.User>
}> = (props) => {
  const state = userStore()

  return (
    <>
      <TextInput
        fieldName="scaleUrl"
        label="Scale URL"
        helperText="Fully qualified Scale URL."
        placeholder={'E.g. https://dashboard.scale.com/spellbook/api/v2/deploy/a1b2c3'}
        value={props.state.scaleUrl}
        onChange={(ev) => props.setter('scaleUrl', ev.currentTarget.value)}
      />
      <TextInput
        fieldName="scaleApiKey"
        label="Scale API Key"
        placeholder={
          state.user?.scaleApiKeySet ? 'Scale API key is set' : 'E.g. 9rv440nv7ogj6s7j312flqijd'
        }
        type="password"
        value={props.state.scaleApiKey}
        onChange={(ev) => props.setter('scaleApiKey', ev.currentTarget.value)}
      />
      <Button schema="red" class="w-max" onClick={() => userStore.deleteKey('scale')}>
        Delete Scale API Key
      </Button>
    </>
  )
}

export default ScaleSettings
