import { Component } from 'solid-js'
import PageHeader from '../../shared/PageHeader'
import VolumeControl from './VolumeControl'
import Divider from '../../shared/Divider'
import { Card } from '../../shared/Card'
import SoundpackPreview from './SoundpackPreview'
import { audioStore } from '/web/store'
import { SoundpackPicker } from './SoundpackPicker'
import { Page } from '/web/Layout'

const SoundsPage: Component<{}> = (props) => {
  const audio = audioStore()

  return (
    <Page>
      <PageHeader title="Sounds" />

      <Card>
        <VolumeControl
          trackId="master"
          parentClass="w-full"
          label="Master Volume"
          helperText="Adjust the overall volume of the application."
        />
      </Card>
      <Divider />

      <Card>
        <VolumeControl
          trackId="background"
          parentClass="w-full"
          label="Background Ambience"
          helperText="Adjust the volume of the continuous background music and ambient sounds."
        />

        <VolumeControl
          trackId="randomAmbient"
          parentClass="w-full"
          label="Random Ambient Events"
          helperText="Adjust the volume of randomly occurring ambient sounds."
        />

        <VolumeControl
          trackId="interaction"
          parentClass="w-full"
          label="Interaction Sound Effects"
          helperText="Adjust the volume of sound effects triggered by user interactions."
        />

        <VolumeControl
          trackId="speech"
          parentClass="w-full"
          label="Narration & Speech"
          helperText="Adjust the volume of text-to-speech narration and character dialogues."
        />
      </Card>

      <Divider />

      <div class="flex flex-col gap-5">
        <Card class="flex flex-row">
          <SoundpackPicker
            fieldName="globalSoundpackPicker"
            label="Global Soundpack"
            helperText="Choose a predefined sound theme for the entire application, customizable per scenario, chat or character. Explore and download more packs, or create your own for a unique experience."
            level="global"
          />
        </Card>

        <SoundpackPreview soundpackId={audio.selectedSoundpacks.global} />
      </div>
    </Page>
  )
}

export default SoundsPage
