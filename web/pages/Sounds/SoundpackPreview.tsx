import { Component, For, Show, createMemo } from 'solid-js'
import { Play } from 'lucide-solid'
import Button from '/web/shared/Button'
import { Card } from '/web/shared/Card'
import { FormLabel } from '/web/shared/FormLabel'
import TextInput from '/web/shared/TextInput'
import Accordian from '/web/shared/Accordian'
import { EventId, Sound, SoundId, SoundpackId } from '/web/shared/Audio/soundpack'
import { audioStore } from '/web/store'
import { SoundPreview, getSoundSource } from './SoundPreview'
import { useTransContext } from '@mbarzda/solid-i18next'
import { TFunction } from 'i18next'

const SoundpackPreview: Component<{
  soundpackId?: SoundpackId
}> = (props) => {
  const [t] = useTransContext()

  const audio = audioStore()

  let soundpack = createMemo(() => audio.soundpacks.find((sp) => sp.id === props.soundpackId))

  let getSound = (id: SoundId | undefined) => {
    return !id ? undefined : soundpack()?.sounds.find((s) => s.soundId === id)
  }

  return (
    <Show when={soundpack()}>
      <div class="flex flex-col gap-5">
        <Card class="flex flex-col gap-5">
          <div>
            <FormLabel
              label={t('play_or_pause')}
              helperText={t('play_or_pause_all_sounds_from_the_current_sound_pack')}
            />
            <Button>
              <Play />
            </Button>
          </div>
          <p>{t('author_x', { author: soundpack()?.author })}</p>
          <p class="text-[var(--text-600)]">{soundpack()?.description}</p>
        </Card>

        <Show when={soundpack()?.backgroundAmbience}>
          <Card class="flex flex-col gap-3">
            <div>{t('background_ambience')}</div>
            <BackgroundAmbience sound={getSound(soundpack()?.backgroundAmbience)} />
          </Card>
        </Show>

        <Show when={soundpack()?.randomAmbientSounds?.length}>
          <Card class="flex flex-col gap-3">
            <div>{t('random_ambient_sounds')}</div>

            <For each={soundpack()?.randomAmbientSounds || []}>
              {(amb, _) => (
                <RandomAmbientEvent
                  sound={getSound(amb.soundId)}
                  frequencyMinSecs={amb.frequencyMinSecs}
                  frequencyMaxSecs={amb.frequencyMaxSecs}
                />
              )}
            </For>
          </Card>
        </Show>

        <Show when={soundpack()?.interactionSounds?.length}>
          <Card class="flex flex-col gap-3">
            <div>{t('interaction_sound_effects')}</div>

            <For each={soundpack()?.interactionSounds || []}>
              {(int, _) => (
                <InteractionSoundEffect eventId={int.eventId} sound={getSound(int.soundId)} />
              )}
            </For>
          </Card>
        </Show>
      </div>
    </Show>
  )
}

export default SoundpackPreview

const BackgroundAmbience: Component<{
  sound: Sound | undefined
}> = (props) => {
  return (
    <div class="flex w-full flex-row gap-5">
      <Accordian title={props.sound?.name} open={false} class="grow">
        <TextInput
          fieldName="audioBgSound"
          type="text"
          readonly={true}
          class="border-[1px]"
          parentClass="grow"
          value={getSoundSource(props.sound)}
        />
      </Accordian>
      <SoundPreview sound={props.sound} />
    </div>
  )
}

const RandomAmbientEvent: Component<{
  sound: Sound | undefined
  frequencyMinSecs: number
  frequencyMaxSecs: number
}> = (props) => {
  const [t] = useTransContext()

  return (
    <div class="flex w-full flex-row gap-5">
      <Accordian title={props.sound?.name} open={false} class="grow">
        <TextInput
          fieldName="audioBgSound"
          type="text"
          readonly={true}
          class="border-[1px]"
          parentClass="grow"
          value={getSoundSource(props.sound)}
        />
        <div class="flex flex-row gap-7">
          <TextInput
            fieldName="audioRandomEventFreqMin"
            type="number"
            readonly={true}
            label={t('minimum_interval_seconds')}
            value={props.frequencyMinSecs}
            parentClass="grow"
          />
          <TextInput
            fieldName="audioRandomEventFreqMax"
            type="number"
            readonly={true}
            label={t('maximum_interval_seconds')}
            value={props.frequencyMaxSecs}
            parentClass="grow"
          />
        </div>
      </Accordian>
      <SoundPreview sound={props.sound} />
    </div>
  )
}

const InteractionSoundEffect: Component<{
  eventId: string
  sound: Sound | undefined
}> = (props) => {
  const [t] = useTransContext()

  return (
    <div class="flex w-full flex-row gap-5">
      <Accordian
        title={`${getEventDescription(t, props.eventId)} - ${props.sound?.name}`}
        open={false}
      >
        <TextInput
          fieldName="audioBgSound"
          type="text"
          readonly={true}
          class="border-[1px]"
          parentClass="grow"
          value={getSoundSource(props.sound)}
        />
      </Accordian>
      <SoundPreview sound={props.sound} />
    </div>
  )
}

function getEventDescription(t: TFunction, eventId: EventId) {
  switch (eventId) {
    case 'menu-item-clicked':
      return t('menu_item_clicked')
    default:
      return t('missing_x', { name: eventId })
  }
}
