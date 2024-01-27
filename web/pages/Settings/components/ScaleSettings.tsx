import { Component } from 'solid-js'
import TextInput from '../../../shared/TextInput'
import { userStore } from '../../../store'
import Button from '../../../shared/Button'
import { useTransContext } from '@mbarzda/solid-i18next'

const ScaleSettings: Component = () => {
  const [t] = useTransContext()

  const state = userStore()

  return (
    <>
      <TextInput
        fieldName="scaleUrl"
        label={t('scale_url')}
        helperText={t('fully_qualified_scale_url')}
        placeholder={t('scale_url_example')}
        value={state.user?.scaleUrl}
      />
      <TextInput
        fieldName="scaleApiKey"
        label={t('scale_api_key')}
        placeholder={
          state.user?.scaleApiKeySet ? t('scale_api_key_is_set') : t('scale_api_key_example')
        }
        type="password"
        value={state.user?.scaleApiKey}
      />
      <Button schema="red" class="w-max" onClick={() => userStore.deleteKey('scale')}>
        {t('delete_scale_api_key')}
      </Button>
    </>
  )
}

export default ScaleSettings
