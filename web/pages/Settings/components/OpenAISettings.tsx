import { Component, createMemo, createSignal, Show } from 'solid-js'
import TextInput from '../../../shared/TextInput'
import { userStore } from '../../../store'
import Button from '../../../shared/Button'
import Modal from '../../../shared/Modal'
import Loading from '../../../shared/Loading'

const OpenAISettings: Component = () => {
  const state = userStore()
  const [usage, setUsage] = createSignal(false)

  const showUsage = () => {
    userStore.openaiUsage()
    setUsage(true)
  }

  return (
    <>
      <TextInput
        fieldName="oaiKey"
        label="OpenAI Key"
        helperText={
          <>
            Valid OpenAI Key.{' '}
            <Show when={state.user?.oaiKeySet || state.user?.oaiKey}>
              <a class="link" onClick={showUsage}>
                View Usage
              </a>
            </Show>
          </>
        }
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
      <OpenAIUsageModal show={usage()} close={() => setUsage(false)} />
    </>
  )
}

export default OpenAISettings

const OpenAIUsageModal: Component<{ show: boolean; close: () => void }> = (props) => {
  const state = userStore()
  const value = createMemo(() => {
    if (state.metadata.openaiUsage === undefined || state.metadata.openaiUsage < 0) 'unknown'

    const amount = Math.round(state.metadata.openaiUsage!) / 100
    return `$${amount}`
  })

  return (
    <Modal title="OpenAI Usage" show={props.show} close={props.close}>
      <div class="flex">
        <div class="mr-4">Usage this month: </div>
        <div>
          <Show when={state.oaiUsageLoading}>
            <Loading />
          </Show>
          <Show when={!state.oaiUsageLoading}>{value()}</Show>
        </div>
      </div>
    </Modal>
  )
}
