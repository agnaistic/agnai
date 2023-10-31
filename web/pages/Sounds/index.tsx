import { Component } from 'solid-js'
import PageHeader from '../../shared/PageHeader'
import VolumeControl from '../../shared/VolumeControl'
import Divider from '../../shared/Divider'
import Select from '../../shared/Select'
import { Card } from '../../shared/Card'
import Accordian from '../../shared/Accordian'
import Button from '../../shared/Button'
import { Play } from 'lucide-solid'
import { FormLabel } from '/web/shared/FormLabel'
import TextInput from '/web/shared/TextInput'

const SoundsPage: Component<{}> = (props) => {
  return (
    <>
      <PageHeader title="Sounds" />

      <Card>
        <VolumeControl
          parentClass="w-full"
          label="Master Volume"
          helperText="Adjust the overall volume of the application."
          track="master"
        />
      </Card>
      <Divider />

      <Card>
        <VolumeControl
          parentClass="w-full"
          label="Background Ambience"
          helperText="Adjust the volume of the continuous background music and ambient sounds."
          track="background"
        />

        <VolumeControl
          parentClass="w-full"
          label="Random Ambient Events"
          helperText="Adjust the volume of randomly occurring ambient sounds."
          track="randomAmbient"
        />

        <VolumeControl
          parentClass="w-full"
          label="Interaction Sound Effects"
          helperText="Adjust the volume of sound effects triggered by user interactions."
          track="interaction"
        />

        <VolumeControl
          parentClass="w-full"
          label="Narration & Speech"
          helperText="Adjust the volume of text-to-speech narration and character dialogues."
          track="speech"
        />
      </Card>

      <Divider />

      <Card class="flex flex-row">
        <Select
          fieldName="audioGlobalSoundpackSelect"
          label="Global Soundpack"
          helperText="Choose a predefined sound theme for the entire application, customizable per scenario, chat or character. Explore and download more packs, or create your own for a unique experience."
          items={[
            new Option('Enchanted Kingdom', 'Enchanted Kingdom'),
            new Option('1', '1'),
            new Option('1', '1'),
          ]}
        />
      </Card>

      <Card class="flex flex-col gap-5">
        <div>
          <FormLabel
            label="Play/Pause"
            helperText="Play/pause all sounds from the current soundpack."
          />
          <Button>
            <Play />
          </Button>
        </div>
        <p>Author: xyz</p>
        <p class="text-[var(--text-600)]">
          Step into a world of magic and adventure with the "Enchanted Kingdom" soundpack. Immerse
          yourself in the medieval atmosphere enriched by the harmonious blend of melodic background
          tunes, the gentle rustling of leaves in an ancient forest, and the distant chatter of a
          bustling marketplace.
        </p>
      </Card>

      <Card>
        <div>Background Ambience</div>
        <SoundPreview source="http://example.com/bg.mp3" />
      </Card>
      <Card class="flex flex-col gap-3">
        <div>Random Ambient Events</div>
        <RandomAmbientEvent
          name="Dragon roar"
          source="http://example.com/dragon.mp3"
          frequencyMinSecs={60}
          frequencyMaxSecs={360}
        />
        <RandomAmbientEvent
          name="Mystic chimes"
          source="http://example.com/chimes.mp3"
          frequencyMinSecs={30}
          frequencyMaxSecs={360}
        />
        <RandomAmbientEvent
          name="Bird song"
          source="http://example.com/birds.mp3"
          frequencyMinSecs={20}
          frequencyMaxSecs={120}
        />
      </Card>
      <Card class="flex flex-col gap-3">
        <div>Interaction Sound Effects</div>
        <InteractionSoundEffect
          event="Menu item clicked"
          source="http://example.com/open_door.mp3"
        />
        <InteractionSoundEffect event="Save changes" source="http://example.com/parchment.mp3" />
      </Card>
    </>
  )
}

export default SoundsPage

const SoundPreview: Component<{
  source: string
}> = (props) => {
  return (
    <div class="flex w-full flex-row gap-5">
      <TextInput
        fieldName="audioBgSound"
        type="text"
        readonly={true}
        class="border-[1px]"
        parentClass="grow"
        value={props.source}
      />
      <Button>
        <Play />
      </Button>
    </div>
  )
}

const RandomAmbientEvent: Component<{
  name: string
  source: string
  frequencyMinSecs: number
  frequencyMaxSecs: number
}> = (props) => {
  return (
    <Accordian title={props.name} open={false}>
      <SoundPreview source={props.source} />
      <div class="flex flex-row gap-7">
        <TextInput
          fieldName="audioRandomEventFreqMin"
          type="number"
          readonly={true}
          label="Minimum interval (seconds)"
          value={props.frequencyMinSecs}
          parentClass="grow"
        />
        <TextInput
          fieldName="audioRandomEventFreqMax"
          type="number"
          readonly={true}
          label="Maximum interval (seconds)"
          value={props.frequencyMaxSecs}
          parentClass="grow"
        />
      </div>
    </Accordian>
  )
}

const InteractionSoundEffect: Component<{
  event: string
  source: string
}> = (props) => {
  return (
    <Accordian title={props.event} open={false}>
      <SoundPreview source={props.source} />
    </Accordian>
  )
}
