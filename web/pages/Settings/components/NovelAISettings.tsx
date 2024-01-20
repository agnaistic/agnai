import { Accessor, Component, Setter, Show, createMemo } from 'solid-js'
import TextInput from '../../../shared/TextInput'
import { userStore } from '../../../store'
import Button from '../../../shared/Button'
import Select from '../../../shared/Select'
import Divider from '/web/shared/Divider'
import { Trans, useTransContext } from '@mbarzda/solid-i18next'

const NovelAISettings: Component = () => {
  const [t] = useTransContext()

  const state = userStore()

  const novelVerified = createMemo(
    () => (state.user?.novelApiKey || state.user?.novelVerified ? 'API Key has been verified' : ''),
    { equals: false }
  )

  return (
    <>
      <Select
        fieldName="novelModel"
        label={t('default_novel_ai_model')}
        helperText={t('this_will_be_used_for_inference')}
        items={[
          { label: t('kayra'), value: 'kayra-v1' },
          { label: t('clio'), value: 'clio-v1' },
        ]}
        value={state.user?.novelModel}
      />

      <Divider />

      <TextInput
        fieldName="novelApiKey"
        label={t('novel_api_key')}
        type="password"
        value={''}
        helperText={
          <Trans key="never_share_this_with_anybody">
            NEVER SHARE THIS WITH ANYBODY! The token from the NovelAI request authorization.
            <a
              class="link"
              target="_blank"
              href="https://github.com/agnaistic/agnai/blob/dev/instructions/novel.md"
            >
              Instructions
            </a>
            .
          </Trans>
        }
        placeholder={novelVerified()}
      />

      <Show when={state.user?.novelVerified}>
        <Button schema="red" class="w-max" onClick={() => userStore.deleteKey('novel')}>
          {t('delete_novel_api_key')}
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
