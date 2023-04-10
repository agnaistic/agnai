import { Component, Show, createMemo } from 'solid-js'
import TextInput from '../../../shared/TextInput'
import { userStore } from '../../../store'
import Button from '../../../shared/Button'
import Select from '../../../shared/Select'

const NovelAISettings: Component = () => {
  const state = userStore()

  const novelVerified = createMemo(
    () => (state.user?.novelVerified ? 'API Key has been verified' : ''),
    { equals: false }
  )

  return (
    <>
      <Select
        fieldName="novelModel"
        label="NovelAI Model"
        items={[
          { label: 'Euterpe', value: 'euterpe-v2' },
          { label: 'Krake', value: 'krake-v2' },
        ]}
        value={state.user?.novelModel}
      />
      <TextInput
        fieldName="novelApiKey"
        label="Novel API Key"
        type="password"
        value={state.user?.novelApiKey}
        helperText={
          <>
            NEVER SHARE THIS WITH ANYBODY! The token from the NovelAI request authorization. Please
            note this token expires periodically. You will occasionally need to re-enter this token.{' '}
            <a
              class="link"
              target="_blank"
              href="https://github.com/luminai-companion/agn-ai/blob/dev/instructions/novel.md"
            >
              Instructions
            </a>
            .
          </>
        }
        placeholder={novelVerified()}
      />
      <Show when={state.user?.novelVerified}>
        <Button schema="red" class="w-max" onClick={() => userStore.deleteKey('novel')}>
          Delete Novel API Key
        </Button>
      </Show>
    </>
  )
}

export default NovelAISettings
