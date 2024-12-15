import { Component, Show } from 'solid-js'
import Select from '../../../shared/Select'
import TextInput from '../../../shared/TextInput'
import { userStore } from '../../../store'
import Button from '../../../shared/Button'
import { SetStoreFunction } from 'solid-js/store'
import { AppSchema } from '/common/types/index'

const KoboldAISettings: Component<{
  state: AppSchema.User
  setter: SetStoreFunction<AppSchema.User>
}> = (props) => {
  return (
    <>
      <TextInput
        fieldName="koboldUrl"
        label="Third-Party or Self-Host URL"
        helperText="E.g. for Kobold, Textgen, Llama.cpp, Ollama, or OpenAI compatible APIs. This URL must be publicly accessible."
        placeholder="E.g. https://local-tunnel-url-10-20-30-40.loca.lt"
        value={props.state.koboldUrl}
        onChange={(ev) => props.setter('koboldUrl', ev.currentTarget.value)}
      />
      <Select
        fieldName="thirdPartyFormat"
        label="Kobold / 3rd-party Format"
        helperText="Re-formats the prompt to the desired output format."
        items={[
          { label: 'None', value: '' },
          { label: 'Kobold', value: 'kobold' },
          { label: 'OpenAI', value: 'openai' },
          { label: 'Aphrodite', value: 'aphrodite' },
          { label: 'OpenAI (Chat Format)', value: 'openai-chat' },
          { label: 'OpenAI (Chat w/ Template)', value: 'openai-chatv2' },
          { label: 'Claude', value: 'claude' },
          { label: 'Textgen (Ooba)', value: 'ooba' },
          { label: 'Llama.cpp', value: 'llamacpp' },
          { label: 'ExLlamaV2', value: 'exllamav2' },
          { label: 'KoboldCpp', value: 'koboldcpp' },
          { label: 'TabbyAPI', value: 'tabby' },
          { label: 'Mistral API', value: 'mistral' },
        ]}
        value={props.state.thirdPartyFormat ?? 'kobold'}
        onChange={(ev) => props.setter('thirdPartyFormat', ev.value as any)}
      />
      <TextInput
        fieldName="thirdPartyPassword"
        label="Third-party API Key"
        helperText="(NEVER put an OpenAI API key here, this would expose your personal information to third parties)"
        placeholder={props.state.thirdPartyPasswordSet ? 'Password is set' : 'E.g. p4ssw0rd123'}
        type="password"
        value={props.state.thirdPartyPassword}
        onChange={(ev) => props.setter('thirdPartyPassword', ev.currentTarget.value)}
      />

      <TextInput
        fieldName="featherlessApiKey"
        helperText={
          <div>
            <Show when={props.state.featherlessApiKeySet}>
              <a class="link" onClick={() => userStore.deleteKey('featherless')}>
                Delete Key
              </a>
            </Show>
          </div>
        }
        label="Featherless API Key"
        placeholder={props.state.featherlessApiKeySet ? 'Password is set' : 'API Key not set'}
        type="password"
        value={props.state.featherlessApiKey}
        onChange={(ev) => props.setter('featherlessApiKey', ev.currentTarget.value)}
      />

      <TextInput
        fieldName="arliApiKey"
        helperText={
          <div>
            <Show when={props.state.arliApiKeySet}>
              <a class="link" onClick={() => userStore.deleteKey('arli')}>
                Delete Key
              </a>
            </Show>
          </div>
        }
        label="ArliAI API Key"
        placeholder={props.state.arliApiKeySet ? 'Password is set' : 'API Key not set'}
        type="password"
        value={props.state.arliApiKey}
        onChange={(ev) => props.setter('arliApiKey', ev.currentTarget.value)}
      />

      <TextInput
        fieldName="mistralKey"
        helperText={
          <div>
            <div>For use with the official Mistral AI service</div>
            <Show when={props.state.mistralKeySet}>
              <a class="link" onClick={() => userStore.deleteKey('mistral')}>
                Delete Key
              </a>
            </Show>
          </div>
        }
        label="Mistral API Key"
        placeholder={props.state.mistralKeySet ? 'Password is set' : 'API Key not set'}
        type="password"
        value={props.state.mistralKey}
        onChange={(ev) => props.setter('mistralKey', ev.currentTarget.value)}
      />

      <Button schema="red" class="w-max" onClick={() => userStore.deleteKey('third-party')}>
        Delete third-party password
      </Button>
    </>
  )
}

export default KoboldAISettings
