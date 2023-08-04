import { Accessor, Component, Setter, Show, createMemo } from 'solid-js'
import TextInput from '../../../shared/TextInput'
import { userStore } from '../../../store'
import Button from '../../../shared/Button'
import Select from '../../../shared/Select'
import Divider from '/web/shared/Divider'

const NovelAISettings: Component = () => {
  const state = userStore()

  const novelVerified = createMemo(
    () => (state.user?.novelApiKey || state.user?.novelVerified ? 'API Key has been verified' : ''),
    { equals: false }
  )

  return (
    <>
      <Select
        fieldName="novelModel"
        label="Default NovelAI Model"
        helperText="This will be used for inferencing. E.g. Generating characters, CYOA, Generating Actions, etc."
        items={[
          { label: 'Clio', value: 'clio-v1' },
          { label: 'Kayra', value: 'kayra-v1' },
        ]}
        value={state.user?.novelModel}
      />

      <Divider />

      <TextInput
        fieldName="novelApiKey"
        label="Novel API Key"
        type="password"
        value={''}
        helperText={
          <>
            NEVER SHARE THIS WITH ANYBODY! The token from the NovelAI request authorization.{' '}
            <a
              class="link"
              target="_blank"
              href="https://github.com/agnaistic/agnai/blob/dev/instructions/novel.md"
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

// @ts-ignore
const novelLogin = async (opts: {
  user: Accessor<string>
  pass: Accessor<string>
  setUser: Setter<string>
  setPass: Setter<string>
  setLoading: Setter<boolean>
}) => {
  opts.setLoading(true)
  const sodium = await import('libsodium-wrappers-sumo')
  await sodium.ready

  const key = sodium
    .crypto_pwhash(
      64,
      new Uint8Array(Buffer.from(opts.pass())),
      sodium.crypto_generichash(
        sodium.crypto_pwhash_SALTBYTES,
        opts.pass().slice(0, 6) + opts.user() + 'novelai_data_access_key'
      ),
      2,
      2e6,
      sodium.crypto_pwhash_ALG_ARGON2ID13,
      'base64'
    )
    .slice(0, 64)

  userStore.novelLogin(key, (err) => {
    opts.setLoading(false)
    if (!err) {
      opts.setPass('')
      opts.setUser('')
    }
  })
}
