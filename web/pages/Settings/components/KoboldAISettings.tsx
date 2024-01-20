import { Component } from 'solid-js'
import Select from '../../../shared/Select'
import TextInput from '../../../shared/TextInput'
import { userStore } from '../../../store'
import Button from '../../../shared/Button'
import { useTransContext } from '@mbarzda/solid-i18next'

const KoboldAISettings: Component = () => {
  const [t] = useTransContext()

  const state = userStore()

  return (
    <>
      <TextInput
        fieldName="koboldUrl"
        label={t('kobold_compatible_or_third_party_url')}
        helperText={t('fully_qualified_url_typically_for_kobold')}
        placeholder={t('kobold_example')}
        value={state.user?.koboldUrl}
      />
      <Select
        fieldName="thirdPartyFormat"
        label={t('kobold_or_third_party_format')}
        helperText={t('reformat_the_prompt_to_the_desired_output_format')}
        items={[
          { label: t('none'), value: '' },
          { label: t('kobold'), value: 'kobold' },
          { label: t('open_ai'), value: 'openai' },
          { label: t('aphrodite'), value: 'aphrodite' },
          { label: t('open_ai_chat'), value: 'openai-chat' },
          { label: t('claude'), value: 'claude' },
          { label: t('textgen_ooba'), value: 'ooba' },
          { label: t('llama_cpp'), value: 'llamacpp' },
          { label: t('exllamaV2'), value: 'exllamav2' },
          { label: t('kobold_cpp'), value: 'koboldcpp' },
        ]}
        value={state.user?.thirdPartyFormat ?? 'kobold'}
      />
      <TextInput
        fieldName="thirdPartyPassword"
        label={t('third_party_password_if_applicable')}
        helperText={t('never_put_an_openai_api_key_here')}
        placeholder={
          state.user?.thirdPartyPasswordSet
            ? t('password_is_set')
            : t('third_party_password_example')
        }
        type="password"
        value={''}
      />
      <Button schema="red" class="w-max" onClick={() => userStore.deleteKey('third-party')}>
        {t('delete_third_party_password')}
      </Button>
    </>
  )
}

export default KoboldAISettings
