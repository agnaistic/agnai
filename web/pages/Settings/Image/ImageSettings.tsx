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

const imageTypes = [
  { label: 'Horde', value: 'horde' },
  { label: 'NovelAI', value: 'novel' },
  { label: 'Stable Diffusion', value: 'sd' },
]

export const ImageSettings: Component = () => {
  const state = userStore()

  const [currentType, setType] = createSignal(state.user?.images?.type || 'horde')
  const subclass = 'flex flex-col gap-4'

  return (
    <div class="flex flex-col gap-4">
      <Select
        fieldName="imageType"
        items={imageTypes}
        value={state.user?.images?.type || 'horde'}
        onChange={(value) => setType(value.value as any)}
      />

      <RangeInput
        fieldName="imageSteps"
        min={20}
        max={128}
        step={1}
        value={state.user?.images?.steps ?? 28}
        label="Sampling Steps"
        helperText="(Novel Anlas Threshold: 28)"
      />

      <RangeInput
        fieldName="imageWidth"
        min={256}
        max={1024}
        step={64}
        value={state.user?.images?.width ?? 384}
        label="Image Width"
        helperText="The larger the image, the less that can be retained in your local cache. (Novel Anlas Threshold: 512)"
      />

      <RangeInput
        fieldName="imageHeight"
        min={256}
        max={1024}
        step={64}
        value={state.user?.images?.height ?? 384}
        label="Image Height"
        helperText="The large the image, the less that can be retain in your local cache. (Novel Anlas Threshold: 512)"
      />

      <TextInput
        fieldName="imageCfg"
        value={state.user?.images?.cfg ?? 9}
        label="CFG Scale"
        helperText="Prompt Guidance. Classifier Free Guidance Scale - how strongly the image should conform to prompt - lower values produce more creative results."
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
  const state = userStore()

  const models = Object.entries(NOVEL_IMAGE_MODEL).map(([key, value]) => ({ label: key, value }))
  const samplers = Object.entries(NOVEL_SAMPLER_REV).map(([key, value]) => ({
    label: value,
    value: key,
  }))
  return (
    <>
      <div class="text-xl">NovelAI</div>
      <Show when={!state.user?.novelVerified && !state.user?.novelApiKey}>
        <div class="font-bold text-red-600">
          You do not have a valid NovelAI key set. You will not be able to generate images using
          Novel.
        </div>
      </Show>
      <em>
        Note: The <b>Anlas Threshold</b> means anything above this value is cost Anlas credits
      </em>
      <Select
        fieldName="novelImageModel"
        items={models}
        label="Model"
        value={state.user?.images?.novel.model}
      />
      <Select
        fieldName="novelSampler"
        items={samplers}
        label="Sampler"
        value={state.user?.images?.novel.sampler || NOVEL_SAMPLER_REV.k_dpmpp_2m}
      />
    </>
  )
}

const HordeSettings: Component = () => {
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
      <div class="text-xl">Horde</div>
      <Select
        fieldName="hordeImageModel"
        items={models()}
        label="Model"
        value={state.user?.images?.horde.model || 'stable_diffusion'}
      />
      <Select
        fieldName="hordeSampler"
        items={samplers}
        label="Sampler"
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
