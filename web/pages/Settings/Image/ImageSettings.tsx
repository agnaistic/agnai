import { Component, Show, createEffect, createMemo, createSignal } from 'solid-js'
import {
  NOVEL_IMAGE_MODEL,
  NOVEL_SAMPLER_REV,
  SD_SAMPLER,
  SD_SAMPLER_REV,
} from '../../../../common/image'
import Divider from '../../../shared/Divider'
import RangeInput from '../../../shared/RangeInput'
import Select from '../../../shared/Select'
import TextInput from '../../../shared/TextInput'
import { settingStore, userStore } from '../../../store'
import { IMAGE_SUMMARY_PROMPT } from '/common/image'
import { Toggle } from '/web/shared/Toggle'
import { TFunction } from 'i18next'
import { Trans, useTransContext } from '@mbarzda/solid-i18next'

const imageTypes = (t: TFunction) => [
  { label: t('horde'), value: 'horde' },
  { label: t('novel_ai'), value: 'novel' },
  { label: t('stable_diffusion'), value: 'sd' },
]

export const ImageSettings: Component = () => {
  const [t] = useTransContext()

  const state = userStore()

  const [currentType, setType] = createSignal(state.user?.images?.type || 'horde')
  const subclass = 'flex flex-col gap-4'

  return (
    <div class="flex flex-col gap-4">
      <Select
        fieldName="imageType"
        items={imageTypes(t)}
        value={state.user?.images?.type || 'horde'}
        onChange={(value) => setType(value.value as any)}
      />

      <RangeInput
        fieldName="imageSteps"
        min={20}
        max={128}
        step={1}
        value={state.user?.images?.steps ?? 28}
        label={t('sampling_steps')}
        helperText={t('novel_anlas_threshold')}
      />

      <RangeInput
        fieldName="imageWidth"
        min={256}
        max={1024}
        step={64}
        value={state.user?.images?.width ?? 384}
        label={t('image_width')}
        helperText={t('the_larger_the_image_the_less_that_can_be_retained')}
      />

      <RangeInput
        fieldName="imageHeight"
        min={256}
        max={1024}
        step={64}
        value={state.user?.images?.height ?? 384}
        label={t('image_height')}
        helperText={t('the_larger_the_image_the_less_that_can_be_retained')}
      />

      <TextInput
        fieldName="imageCfg"
        value={state.user?.images?.cfg ?? 9}
        label={t('cfg_scale')}
        helperText={t('prompt_guidance_classifier_free_guidance_scale')}
      />

      <TextInput
        fieldName="imagePrefix"
        value={state.user?.images?.prefix}
        label={t('prompt_prefix')}
        helperText={t('text_to_prepend_to_your_image_prompt')}
        placeholder={t('prompt_prefix_example')}
      />

      <TextInput
        fieldName="imageSuffix"
        value={state.user?.images?.suffix}
        label={t('prompt_suffix')}
        helperText={t('text_to_append_to_your_image_prompt')}
        placeholder={t('prompt_suffix_example')}
      />

      <TextInput
        fieldName="imageNegative"
        value={state.user?.images?.negative}
        label={t('negative_prompt')}
        helperText={t('negative_prompt_message')}
        placeholder={t('negative_prompt_example')}
      />

      <TextInput
        fieldName="summaryPrompt"
        value={state.user?.images?.summaryPrompt}
        label={t('summary_prompt')}
        helperText={t('summary_prompt_message')}
        placeholder={t('default_colon_x', { name: IMAGE_SUMMARY_PROMPT.other })}
      />

      <Toggle
        fieldName="summariseChat"
        label={t('summarise_chat')}
        helperText={t('summarise_chat_message')}
        value={state.user?.images?.summariseChat}
      />

      <Divider />

      <div class={currentType() === 'novel' ? subclass : 'hidden'}>
        <NovelSettings />
      </div>

      <div class={currentType() === 'horde' ? subclass : 'hidden'}>
        <HordeSettings />
      </div>

      <div class={currentType() === 'sd' ? subclass : 'hidden'}>
        <SDSettings />
      </div>
    </div>
  )
}

const NovelSettings: Component = () => {
  const [t] = useTransContext()

  const state = userStore()

  const models = Object.entries(NOVEL_IMAGE_MODEL).map(([key, value]) => ({ label: key, value }))
  const samplers = Object.entries(NOVEL_SAMPLER_REV).map(([key, value]) => ({
    label: value,
    value: key,
  }))
  return (
    <>
      <div class="text-xl">{t('novel_ai')}</div>
      <Show when={!state.user?.novelVerified && !state.user?.novelApiKey}>
        <div class="font-bold text-red-600">{t('you_do_not_have_a_valid_novel_ai_key_set')}</div>
      </Show>
      <em>
        <Trans key="note_the_anlas_threshold_means">
          Note: The <b>Anlas Threshold</b> means anything above this value is cost Anlas credits
        </Trans>
      </em>
      <Select
        fieldName="novelImageModel"
        items={models}
        label={t('model')}
        value={state.user?.images?.novel.model}
      />
      <Select
        fieldName="novelSampler"
        items={samplers}
        label={t('sampler')}
        value={state.user?.images?.novel.sampler || NOVEL_SAMPLER_REV.k_dpmpp_2m}
      />
    </>
  )
}

const HordeSettings: Component = () => {
  const [t] = useTransContext()

  const state = userStore()
  const cfg = settingStore()

  const models = createMemo(() => {
    const map = new Map<string, number>()

    for (const worker of cfg.imageWorkers) {
      for (const model of worker.models) {
        if (!map.has(model)) {
          map.set(model, 0)
        }

        const current = map.get(model) ?? 0
        map.set(model, current + 1)
      }
    }

    const items = Array.from(map.entries())
      .sort(([, l], [, r]) => (l > r ? -1 : l === r ? 0 : 1))
      .map(([name, count]) => ({
        label: `${name} (${count})`,
        value: name,
      }))
    return items
  })

  createEffect(() => {
    settingStore.getHordeImageWorkers()
  })

  const samplers = Object.entries(SD_SAMPLER_REV).map(([key, value]) => ({
    label: value,
    value: key,
  }))
  return (
    <>
      <div class="text-xl">{t('horde')}</div>
      <Select
        fieldName="hordeImageModel"
        items={models()}
        label={t('model')}
        value={state.user?.images?.horde.model || 'stable_diffusion'}
      />
      <Select
        fieldName="hordeSampler"
        items={samplers}
        label={t('sampler')}
        value={state.user?.images?.horde.sampler || SD_SAMPLER['DPM++ 2M']}
      />
    </>
  )
}

const SDSettings: Component = () => {
  const state = userStore()

  const samplers = Object.entries(SD_SAMPLER_REV).map(([key, value]) => ({
    label: value,
    value: key,
  }))
  return (
    <>
      <div class="text-xl">Stable Diffusion</div>
      <TextInput
        fieldName="sdUrl"
        label="Stable Diffusion WebUI URL"
        helperText="Base URL for Stable Diffusion. E.g. https://local-tunnel-url-10-20-30-40.loca.lt. If you are self-hosting, you can use http://localhost:7860"
        placeholder="E.g. https://local-tunnel-url-10-20-30-40.loca.lt"
        value={state.user?.images?.sd.url}
      />
      <Select
        fieldName="sdSampler"
        items={samplers}
        label="Sampler"
        value={state.user?.images?.sd.sampler || SD_SAMPLER['DPM++ 2M']}
      />
    </>
  )
}
