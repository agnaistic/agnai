import { Component, Show, createMemo, createSignal } from 'solid-js'
import TextInput from '../../../shared/TextInput'
import { userStore } from '../../../store'
import Button from '../../../shared/Button'
import Select from '../../../shared/Select'
import Divider from '/web/shared/Divider'
import { FormLabel } from '/web/shared/FormLabel'

const NovelAISettings: Component = () => {
  const state = userStore()
  const [user, setUser] = createSignal('')
  const [pass, setPass] = createSignal('')
  const [loading, setLoading] = createSignal(false)

  const novelVerified = createMemo(
    () => (state.user?.novelApiKey || state.user?.novelVerified ? 'API Key has been verified' : ''),
    { equals: false }
  )

  const novelLogin = async () => {
    setLoading(true)
    const sodium = await import('libsodium-wrappers-sumo')
    await sodium.ready

    const key = sodium
      .crypto_pwhash(
        64,
        new Uint8Array(Buffer.from(pass())),
        sodium.crypto_generichash(
          sodium.crypto_pwhash_SALTBYTES,
          pass().slice(0, 6) + user() + 'novelai_data_access_key'
        ),
        2,
        2e6,
        sodium.crypto_pwhash_ALG_ARGON2ID13,
        'base64'
      )
      .slice(0, 64)

    userStore.novelLogin(key, (err) => {
      setLoading(false)
      if (!err) {
        setPass('')
        setUser('')
      }
    })
  }

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
      <FormLabel
        label="NovelAI Login"
        helperText="Login to NovelAI. Your credentials will not be stored anywhere. This is to obtain your API key and intended for users that cannot obtain their key any other way."
      />
      <div class="flex flex-col flex-wrap gap-2 sm:flex-row sm:items-end">
        <TextInput
          fieldName="novelUsername"
          label="NovelAI Email"
          onChange={(ev) => setUser(ev.currentTarget.value)}
          value={user()}
        />
        <TextInput
          fieldName="novelpassword"
          label="NovelAI Password"
          type="password"
          value={pass()}
          onChange={(ev) => setPass(ev.currentTarget.value)}
        />
        <Button onClick={novelLogin} disabled={loading() || (!user() && !pass())}>
          Login to NovelAI
        </Button>
      </div>
      <Divider />

      <TextInput
        fieldName="novelApiKey"
        label="Novel API Key"
        type="password"
        value={''}
        helperText={
          <>
            NEVER SHARE THIS WITH ANYBODY! The token from the NovelAI request authorization. Please
            note this token expires periodically. You will occasionally need to re-enter this token.{' '}
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
