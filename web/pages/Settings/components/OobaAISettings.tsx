import { Component } from 'solid-js'
import TextInput from '../../../shared/TextInput'
import { userStore } from '../../../store'
import { useTransContext } from '@mbarzda/solid-i18next'

const OobaAISettings: Component = () => {
  const [t] = useTransContext()

  const state = userStore()

  return (
    <>
      <TextInput
        fieldName="oobaUrl"
        label={t('text_generation_compatible_url')}
        helperText={t('this_url_must_be_publicly_accessible')}
        placeholder={t('text_generation_example')}
        value={state.user?.oobaUrl}
      />
    </>
  )
}

export default OobaAISettings
