import { Component } from 'solid-js'
import PageHeader from '../../shared/PageHeader'
import VolumeControl from './VolumeControl'
import Divider from '../../shared/Divider'
import { Card } from '../../shared/Card'
import SoundpackPreview from './SoundpackPreview'
import { audioStore } from '/web/store'
import { SoundpackPicker } from './SoundpackPicker'
import { useTransContext } from '@mbarzda/solid-i18next'

const SoundsPage: Component<{}> = (props) => {
  const [t] = useTransContext()

  const audio = audioStore()

  return (
    <>
      <PageHeader title="Sounds" />

      <Card>
        <VolumeControl
          trackId="master"
          parentClass="w-full"
          label={t('master_volume')}
          helperText={t('adjust_the_overall_volume_of_the_application')}
        />
      </Card>
      <Divider />

      <Card>
        <VolumeControl
          trackId="background"
          parentClass="w-full"
          label={t('background_ambience')}
          helperText={t('adjust_the_volume_of_the_continuous_background')}
        />

        <VolumeControl
          trackId="randomAmbient"
          parentClass="w-full"
          label={t('random_ambient_events')}
          helperText={t('adjust_the_volume_of_randomly_occurring_ambient_sounds')}
        />

        <VolumeControl
          trackId="interaction"
          parentClass="w-full"
          label={t('interaction_sound_effects')}
          helperText={t('adjust_the_volume_of_sound_effects')}
        />

        <VolumeControl
          trackId="speech"
          parentClass="w-full"
          label={t('narration_and_speech')}
          helperText={t('adjust_the_volume_of_text_to_speech')}
        />
      </Card>

      <Divider />

      <div class="flex flex-col gap-5">
        <Card class="flex flex-row">
          <SoundpackPicker
            fieldName="globalSoundpackPicker"
            label={t('global_sound_pack')}
            helperText={t('choose_a_predefined_sound_theme_for_the_entire_application')}
            level="global"
          />
        </Card>

        <SoundpackPreview soundpackId={audio.selectedSoundpacks.global} />
      </div>
    </>
  )
}

export default SoundsPage
