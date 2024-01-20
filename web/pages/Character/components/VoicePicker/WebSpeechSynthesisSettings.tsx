import { Component } from 'solid-js'
import { VoiceSettingForm } from '../../../../../common/types/texttospeech-schema'
import RangeInput from '../../../../shared/RangeInput'
import { useTransContext } from '@mbarzda/solid-i18next'

export const WebSpeechSynthesisSettings: Component<{
  settings: VoiceSettingForm<'webspeechsynthesis'>
  onChange: (value: VoiceSettingForm<'webspeechsynthesis'>) => void
}> = (props) => {
  const [t] = useTransContext()

  const update = (diff: Partial<VoiceSettingForm<'webspeechsynthesis'>>) => {
    props.onChange({ ...props.settings, ...diff })
  }

  return (
    <>
      <RangeInput
        fieldName="webSpeechSynthesisStability"
        label={t('pitch')}
        helperText={t('pitch_message')}
        value={props.settings.pitch ?? 1}
        min={0}
        max={2}
        step={0.01}
        onChange={(value) => update({ pitch: value })}
      />
      <RangeInput
        fieldName="webSpeechSynthesisSimilarityBoost"
        label={t('rate')}
        helperText={t('rate_message')}
        value={props.settings.rate ?? 1}
        min={0.1}
        max={10}
        step={0.01}
        onChange={(value) => update({ rate: value })}
      />
    </>
  )
}
