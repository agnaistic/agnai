import { Component } from 'solid-js'
import TextInput from '../../../shared/TextInput'
import { userStore } from '../../../store'
import Button from '../../../shared/Button'
import { useTransContext } from '@mbarzda/solid-i18next'

const ClaudeSettings: Component = () => {
  const [t] = useTransContext()

  const state = userStore()
  return (
    <>
      <TextInput
        fieldName="claudeApiKey"
        label={t('claude_key')}
        helperText={t('valid_claude_key')}
        placeholder={state.user?.claudeApiKeySet ? t('claude_key_is_set') : t('claude_key_example')}
        type="password"
        value={state.user?.claudeApiKey}
      />
      <Button schema="red" class="w-max" onClick={() => userStore.deleteKey('claude')}>
        {t('delete_claude_key')}
      </Button>
    </>
  )
}

export default ClaudeSettings
