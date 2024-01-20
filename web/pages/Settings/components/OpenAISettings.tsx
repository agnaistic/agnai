import { Component } from 'solid-js'
import TextInput from '../../../shared/TextInput'
import { userStore } from '../../../store'
import Button from '../../../shared/Button'
import { useTransContext } from '@mbarzda/solid-i18next'

const OpenAISettings: Component = () => {
  const [t] = useTransContext()

  const state = userStore()

  return (
    <>
      <TextInput
        fieldName="oaiKey"
        label={t('open_ai_key')}
        helperText={t('valid_open_ai_key')}
        placeholder={
          state.user?.oaiKeySet || state.user?.oaiKey
            ? t('open_ai_key_is_set')
            : t('open_ai_key_example')
        }
        type="password"
        value={''}
      />
      <Button schema="red" class="w-max" onClick={() => userStore.deleteKey('openai')}>
        {t('delete_open_ai_key')}
      </Button>
    </>
  )
}

export default OpenAISettings
