import { Component } from 'solid-js'
import { userStore } from '../../../store'
import TextInput from '../../../shared/TextInput'
import Button from '../../../shared/Button'
import { useTransContext } from '@mbarzda/solid-i18next'

const ElevenLabsSettings: Component = () => {
  const [t] = useTransContext()

  const state = userStore()

  return (
    <>
      <div class="text-xl">{t('eleven_labs')}</div>

      <TextInput
        fieldName="elevenLabsApiKey"
        label={t('eleven_labs_api_key')}
        placeholder={
          state.user?.elevenLabsApiKeySet || state.user?.elevenLabsApiKey
            ? t('eleven_labs_api_key_is_set')
            : t('eleven_labs_api_key_example')
        }
        type="password"
      />

      <Button schema="red" class="w-max" onClick={() => userStore.deleteKey('elevenlabs')}>
        {t('delete_elevenlabs_api_key')}
      </Button>
    </>
  )
}

export default ElevenLabsSettings
