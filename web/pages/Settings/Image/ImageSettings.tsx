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
import { BaseImageSettings } from '/common/types/image-schema'
import { SolidCard } from '/web/shared/Card'

export const ImageSettings: Component<{ cfg?: BaseImageSettings; inherit?: boolean }> = (props) => {
  const state = userStore()
  const settings = settingStore()
  const [type, setType] = createSignal(state.user?.images?.type || 'horde')

  const canUseImages = createMemo(() => {
    const access = state.sub?.tier.imagesAccess || state.user?.admin
    return (
      settings.config.serverConfig?.imagesEnabled &&
      access &&
      settings.config.serverConfig?.imagesModels?.length > 0
    )
  })

  const agnaiModel = createMemo(() => {
    if (!canUseImages()) return
    if (type() !== 'agnai') return

    const id = state.user?.images?.agnai?.model
    return settings.config.serverConfig?.imagesModels?.find((m) => m.name === id)
  })

  const imageTypes = createMemo(() => {
    const list = [
      { label: 'Horde', value: 'horde' },
      { label: 'NovelAI', value: 'novel' },
      { label: 'Stable Diffusion', value: 'sd' },
    ]

    if (canUseImages()) {
      list.push({ label: 'Agnaistic', value: 'agnai' })
    }

    return list
  })

  const subclass = 'flex flex-col gap-4'

  return (
    <div class="flex flex-col gap-4">
      <Select
        fieldName="imageType"
        items={imageTypes()}
        value={(props.inherit ? props.cfg?.type : state.user?.images?.type) ?? 'horde'}
        onChange={(value) => setType(value.value as any)}
      />

      <Show when={type() === 'agnai'}>
        <SolidCard bg="rose-600">
          Refer to the recommended settings at the bottom of the page when using Agnaistic image
          models
        </SolidCard>
      </Show>

      <RangeInput
        fieldName="imageSteps"
        min={20}
        max={128}
        step={1}
        value={
          (props.inherit ? props.cfg?.steps : state.user?.images?.steps) ??
          agnaiModel()?.init.steps ??
          28
        }
        label="Sampling Steps"
        helperText="(Novel Anlas Threshold: 28)"
      />

      <RangeInput
        fieldName="imageWidth"
        min={256}
        max={1024}
        step={64}
        value={
          (props.inherit ? props.cfg?.width : state.user?.images?.width) ??
          agnaiModel()?.init.width ??
          384
        }
        label="Image Width"
        helperText="The larger the image, the less that can be retained in your local cache. (Novel Anlas Threshold: 512)"
      />

      <RangeInput
        fieldName="imageHeight"
        min={256}
        max={1024}
        step={64}
        value={
          (props.inherit ? props.cfg?.height : state.user?.images?.height) ??
          agnaiModel()?.init.height ??
          384
        }
        label="Image Height"
        helperText="The larger the image, the less that can be retain in your local cache. (Novel Anlas Threshold: 512)"
      />

      <TextInput
        fieldName="imageCfg"
        value={
          (props.inherit ? props.cfg?.cfg : state.user?.images?.cfg) ?? agnaiModel()?.init.cfg ?? 9
        }
        label="CFG Scale"
        helperText="Prompt Guidance. Classifier Free Guidance Scale - how strongly the image should conform to prompt - lower values produce more creative results."
      />

      <TextInput
        fieldName="imagePrefix"
        value={props.inherit ? props.cfg?.prefix : state.user?.images?.prefix}
        label="Prompt Prefix"
        helperText="(Optional) Text to prepend to your image prompt"
        placeholder={`E.g.: best quality, masterpiece`}
      />

      <TextInput
        fieldName="imageSuffix"
        value={props.inherit ? props.cfg?.suffix : state.user?.images?.suffix}
        label="Prompt Suffix"
        helperText="(Optional) Text to append to your image prompt"
        placeholder={`E.g.: full body, visible legs, dramatic lighting`}
      />

      <TextInput
        fieldName="imageNegative"
        value={props.inherit ? props.cfg?.negative : state.user?.images?.negative}
        label="Negative Prompt"
        helperText="(Optional) Negative Prompt"
        placeholder={`E.g.: painting, drawing, illustration, glitch, deformed, mutated, cross-eyed, disfigured`}
      />

      <TextInput
        fieldName="summaryPrompt"
        value={props.inherit ? props.cfg?.summaryPrompt : state.user?.images?.summaryPrompt}
        label="Summary Prompt"
        helperText='When summarising the chat to an image caption, this is the "prompt" sent to OpenAI to summarise your conversation into an image prompt.'
        placeholder={`Default: ${IMAGE_SUMMARY_PROMPT.other}`}
      />

      <Toggle
        fieldName="summariseChat"
        label="Summarise Chat"
        helperText="When available use your AI service to summarise the chat into an image prompt. Only available with services with Instruct capabilities (Agnai, NovelAI, OpenAI, Claude, etc)"
        value={props.inherit ? props.cfg?.summariseChat : state.user?.images?.summariseChat}
      />

      <Show when={!props.inherit}>
        <Divider />

        <div class={type() === 'novel' ? subclass : 'hidden'}>
          <NovelSettings />
        </div>

        <div class={type() === 'horde' ? subclass : 'hidden'}>
          <HordeSettings />
        </div>

        <div class={type() === 'sd' ? subclass : 'hidden'}>
          <SDSettings />
        </div>

        <div class={type() === 'agnai' ? subclass : 'hidden'}>
          <AgnaiSettings />
        </div>
      </Show>
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

const AgnaiSettings: Component = () => {
  const state = userStore()
  const settings = settingStore((s) => {
    const models = s.config.serverConfig?.imagesModels || []
    return {
      models,
      names: models.map((m) => ({ label: m.desc.trim(), value: m.name })),
    }
  })

  const [curr, setCurr] = createSignal(state.user?.images?.agnai?.model)

  const model = createMemo(() => {
    const original = state.user?.images?.agnai?.model
    const id = settings.models.length === 1 ? settings.models[0].name : curr() || original
    const match = settings.models.find((m) => m.name === id)
    return match
  })

  return (
    <>
      <div class="text-xl">Agnaistic</div>
      <Show when={settings.models.length === 0}>
        <i>No additional options available</i>
      </Show>
      <Select
        fieldName="agnaiModel"
        label="Agnaistic Image Model"
        items={settings.names}
        value={state.user?.images?.agnai?.model}
        disabled={settings.models.length <= 1}
        classList={{ hidden: settings.models.length === 0 }}
        onChange={(ev) => setCurr(ev.value)}
      />

      <Show when={!!model()}>
        <div>
          <table class="table-auto border-separate border-spacing-2 ">
            <thead>
              <tr>
                <Th />
                <Th>Steps</Th>
                <Th>CFG</Th>
                <Th>Width</Th>
                <Th>Height</Th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <Td>Recommended</Td>
                <Td>{model()?.init.steps}</Td>
                <Td>{model()?.init.cfg}</Td>
                <Td>{model()?.init.width}</Td>
                <Td>{model()?.init.height}</Td>
              </tr>

              <tr>
                <Td>Maximums</Td>
                <Td>{model()?.limit.steps}</Td>
                <Td>{model()?.limit.cfg}</Td>
                <Td>{model()?.limit.width}</Td>
                <Td>{model()?.limit.height}</Td>
              </tr>
            </tbody>
          </table>
        </div>
      </Show>
    </>
  )
}

const Th: Component<{ children?: any }> = (props) => (
  <th
    class="rounded-md border-[var(--bg-600)] p-2 font-bold"
    classList={{ border: !!props.children, 'bg-[var(--bg-700)]': !!props.children }}
  >
    {props.children}
  </th>
)
const Td: Component<{ children?: any }> = (props) => (
  <td class="rounded-md border-[var(--bg-600)] p-2 " classList={{ border: !!props.children }}>
    {props.children}
  </td>
)
