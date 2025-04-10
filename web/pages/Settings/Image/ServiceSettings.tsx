import { Component, For, Index, Show, createEffect, createMemo, createSignal, on } from 'solid-js'
import {
  NOVEL_IMAGE_MODEL,
  NOVEL_SAMPLER_REV,
  SD_SAMPLER,
  SD_SAMPLER_REV,
} from '../../../../common/image'
import Select from '../../../shared/Select'
import TextInput from '../../../shared/TextInput'
import { settingStore, userStore } from '../../../store'
import { ImageSettings } from '/common/types/image-schema'
import { SetStoreFunction } from 'solid-js/store'
import { applyStoreProperty } from '/web/shared/util'
import { Toggle } from '/web/shared/Toggle'
import Button, { ToggleButton } from '/web/shared/Button'
import { Info, X } from 'lucide-solid'
import { Card, Pill } from '/web/shared/Card'
import { InlineRangeInput } from '/web/shared/RangeInput'

export const NovelSettings: Component<{
  cfg: ImageSettings
  setter: SetStoreFunction<ImageSettings>
}> = (props) => {
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

      <Toggle
        fieldName="novelQualityTags"
        label="Add Quality Tags"
        value={props.cfg.novel.qualityTags}
        onChange={(ev) => props.setter(applyStoreProperty(props.cfg, 'novel.qualityTags', ev))}
      />

      <Select
        fieldName="novelUndesiredContent"
        label="Undesired Content"
        helperMarkdown="Add `nsfw` to your negative prompt to omit NSFW content"
        items={[
          { label: 'Heavy', value: '0' },
          { label: 'Light', value: '1' },
          { label: 'None', value: '2' },
        ]}
        value={props.cfg.novel.ucPreset || '0'}
        onChange={(ev) => props.setter(applyStoreProperty(props.cfg, 'novel.ucPreset', ev.value))}
      />

      <Select
        fieldName="novelImageModel"
        items={models}
        label="Model"
        value={props.cfg?.novel?.model}
        onChange={(ev) => props.setter(applyStoreProperty(props.cfg, 'novel.model', ev.value))}
      />
      <Select
        fieldName="novelSampler"
        items={samplers}
        label="Sampler"
        value={props.cfg?.novel?.sampler || NOVEL_SAMPLER_REV.k_dpmpp_2m}
        onChange={(ev) => props.setter(applyStoreProperty(props.cfg, 'novel.sampler', ev.value))}
      />
    </>
  )
}

export const HordeSettings: Component<{
  cfg: ImageSettings
  setter: SetStoreFunction<ImageSettings>
}> = (props) => {
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
    settingStore.getImageLoras()
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
        value={props.cfg.horde?.model || 'stable_diffusion'}
        onChange={(ev) => props.setter(applyStoreProperty(props.cfg, 'horde.model', ev.value))}
      />
      <Select
        fieldName="hordeSampler"
        items={samplers}
        label="Sampler"
        value={props.cfg.horde?.sampler || SD_SAMPLER['DPM++ 2M']}
        onChange={(ev) => props.setter(applyStoreProperty(props.cfg, 'horde.sampler', ev.value))}
      />
    </>
  )
}

export const SDSettings: Component<{
  cfg: ImageSettings
  setter: SetStoreFunction<ImageSettings>
}> = (props) => {
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
        value={props.cfg.sd?.url}
        onChange={(ev) =>
          props.setter(applyStoreProperty(props.cfg, 'sd.url', ev.currentTarget.value))
        }
      />
      <Select
        fieldName="sdSampler"
        items={samplers}
        label="Sampler"
        value={props.cfg.sd?.sampler || SD_SAMPLER['DPM++ 2M']}
        onChange={(ev) => props.setter(applyStoreProperty(props.cfg, 'sd.sampler', ev.value))}
      />
    </>
  )
}

export const AgnaiSettings: Component<{
  cfg: ImageSettings
  setter: SetStoreFunction<ImageSettings>
}> = (props) => {
  const settings = settingStore((s) => {
    const models = s.config.serverConfig?.imagesModels || []
    return {
      loras: s.loras,
      embeddings: s.embeddings,
      models,
      names: models.map((m) => ({ label: m.desc.trim(), value: m.id || m.name })),
    }
  })

  const [loras, setLoras] = createSignal(props.cfg.agnai.loras || [])
  const loraList = createMemo(() => {
    const list = loras().map((lora) => {
      const tags = settings.loras.find((l) => l.id === lora.id)
      if (!tags) return { ...lora, tags: undefined }
      return { ...lora, tags: tags.tags }
    })

    return list
  })

  const model = createMemo(() => {
    const original = props.cfg.agnai?.model
    const id =
      settings.models.length === 1
        ? settings.models[0].id || settings.models[0].name
        : props.cfg.agnai?.model || original
    const match = settings.models.find((m) => m.id === id || m.name === id)
    return match
  })

  const samplers = createMemo(() => {
    return Object.entries(SD_SAMPLER_REV).map(([key, value]) => ({
      label: value,
      value: key,
    }))
  })

  const availableLoras = createMemo(() => {
    const list = settings.loras
      .filter((lora) => {
        if (!props.cfg.agnai.loras?.length) return lora
        return true
        // if (used) return false
      })
      .map((lora) => ({ label: lora.name, value: lora.id }))

    return [{ label: 'None', value: '' }].concat(list)
  })

  const addLora = () => {
    const next = loras().concat({ id: '', clipStrength: 1.0, modelStrength: 1.0, enabled: true })
    props.setter(applyStoreProperty(props.cfg, 'agnai.loras', next))
    setLoras(next)
  }

  const removeLora = (i: number) => {
    const next = loras().filter((_, index) => index !== i)
    props.setter(applyStoreProperty(props.cfg, 'agnai.loras', next))
    setLoras(next)
  }

  const updateLora = (
    index: number,
    update: Partial<{ id: string; clipStrength: number; modelStrength: number; enabled?: boolean }>
  ) => {
    const next = loras().map((lora, i) => {
      if (i !== index) return lora
      return { ...lora, ...update }
    })

    setLoras(next)
    props.setter(applyStoreProperty(props.cfg, 'agnai.loras', next))
  }

  createEffect(
    on(
      () => props.cfg.agnai.loras,
      () => {
        const prev = loras()
        if (prev.length !== props.cfg.agnai.loras?.length) return
        setLoras(props.cfg.agnai.loras || [])
      }
    )
  )

  const loraHelp = (tags?: Record<string, number>) => {
    if (!tags) return

    const list = Object.entries(tags)
      .map(([key, value]) => ({ tag: key, count: value }))
      .sort((l, r) => r.count - l.count)

    const content = (
      <div class="flex flex-col">
        <div class="bold">Tags / Keyword</div>
        <div class="flex flex-wrap gap-1">
          <For each={list}>
            {(tag) => (
              <Pill small>
                <span class="bold">{tag.tag}</span>: <span>{tag.count}</span>
              </Pill>
            )}
          </For>
        </div>
      </div>
    )

    settingStore.openConfirm({ message: content })
  }

  return (
    <>
      <div class="text-xl">Agnaistic</div>
      <Show when={settings.models.length === 0}>
        <i>No additional options available</i>
      </Show>
      <div class="flex items-end gap-2">
        <Select
          fieldName="agnaiModel"
          label="Image Model"
          items={settings.names}
          value={props.cfg.agnai?.model || settings.names[0]?.value}
          disabled={settings.models.length <= 1}
          classList={{ hidden: settings.models.length === 0 }}
          onChange={(ev) => props.setter(applyStoreProperty(props.cfg, 'agnai.model', ev.value))}
        />
        <Show when={settings.loras.length}>
          <Button onClick={addLora} disabled={availableLoras().length === 0}>
            + Lora
          </Button>
        </Show>
      </div>

      <Show when={settings.loras.length}>
        <Index each={loraList()}>
          {(lora, i) => (
            <Card class="flex flex-col gap-1">
              <div class="flex items-center gap-1">
                <div class="icon-button" onClick={() => removeLora(i)}>
                  <X size={20} />
                </div>
                <Select
                  class="max-w-48 text-sm"
                  items={availableLoras()}
                  value={lora().id}
                  onChange={(ev) => updateLora(i, { id: ev.value })}
                />

                <Button size="sm" schema="hollow" onClick={() => loraHelp(lora().tags)}>
                  Tags <Info size={16} />
                </Button>

                <ToggleButton
                  size="sm"
                  onChange={(ev) => updateLora(i, { enabled: ev })}
                  value={lora().enabled}
                >
                  {lora().enabled ? 'On' : 'Off'}
                </ToggleButton>
              </div>
              <InlineRangeInput
                fieldName="modelStrength"
                label="Model Strength"
                min={0}
                max={2}
                parentClass="text-sm"
                value={lora().modelStrength}
                onChange={(ev) => updateLora(i, { modelStrength: +ev })}
                step={0.05}
              />
              <InlineRangeInput
                fieldName="clipStrength"
                label="Clip Strength"
                min={0}
                max={2}
                parentClass="text-sm"
                value={lora().clipStrength}
                onChange={(ev) => updateLora(i, { clipStrength: +ev })}
                step={0.05}
              />
            </Card>
          )}
        </Index>
      </Show>

      <Select
        fieldName="agnaiSampler"
        items={samplers()}
        label={`Sampler`}
        value={props.cfg.agnai?.sampler}
        onChange={(ev) => props.setter(applyStoreProperty(props.cfg, 'agnai.sampler', ev.value))}
      />

      <Toggle
        label="Draft Mode"
        helperText="If available: Quickly generate a lower quality image"
        value={props.cfg.agnai?.draftMode}
        onChange={(ev) => props.setter(applyStoreProperty(props.cfg, 'agnai.draftMode', ev))}
      />

      <Show when={!!model()}>
        <div>
          <table class="table-auto border-separate border-spacing-1 text-sm ">
            <thead>
              <tr>
                <Th />
                <Th>Steps</Th>
                <Th>CFG</Th>
                <Th>Width</Th>
                <Th>Height</Th>
                <Th>Clip Skip</Th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <Td class="bg-700 !border-0">Recommended</Td>
                <Td>{model()?.init.steps}</Td>
                <Td>{model()?.init.cfg}</Td>
                <Td>{model()?.init.width}</Td>
                <Td>{model()?.init.height}</Td>
                <Td>{model()?.init.clipSkip || ''}</Td>
              </tr>

              <tr>
                <Td class="bg-700 !border-0">Limits</Td>
                <Td>{model()?.limit.steps}</Td>
                <Td>{model()?.limit.cfg}</Td>
                <Td>{model()?.limit.width}</Td>
                <Td>{model()?.limit.height}</Td>
                <Td>{model()?.limit.clipSkip || ''}</Td>
              </tr>

              <Show when={model()?.init.sampler}>
                <tr>
                  <Td class="bg-700 !border-0">Sampler</Td>
                  <Td span={5}>{(SD_SAMPLER_REV as any)[model()?.init.sampler!]}</Td>
                </tr>
              </Show>

              <tr>
                <Td class="bg-700 !border-0">Prefix</Td>
                <Td span={5}>{model()?.init.prefix}</Td>
              </tr>

              <tr>
                <Td class="bg-700 !border-0">Suffix</Td>
                <Td span={5}>{model()?.init.suffix}</Td>
              </tr>

              <tr>
                <Td class="bg-700 !border-0">Negative</Td>
                <Td span={5}>{model()?.init.negative}</Td>
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
    class="rounded-md border-[var(--bg-600)] px-2 font-bold"
    classList={{ border: !!props.children, 'bg-[var(--bg-700)]': !!props.children }}
  >
    {props.children}
  </th>
)
const Td: Component<{ children?: any; span?: number; class?: string }> = (props) => (
  <td
    class={`rounded-md border-[var(--bg-700)] px-2 ${props.class || ''}`}
    colSpan={props.span}
    classList={{ border: !!props.children }}
  >
    {props.children}
  </td>
)
