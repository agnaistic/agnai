import { Component, Show, createEffect, createMemo } from 'solid-js'
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
      <em>
        Note: The <b>Anlas Threshold</b> means anything above this value is cost Anlas credits
      </em>
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
      models,
      names: models.map((m) => ({ label: m.desc.trim(), value: m.id || m.name })),
    }
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
        value={props.cfg.agnai?.model || settings.names[0]?.value}
        disabled={settings.models.length <= 1}
        classList={{ hidden: settings.models.length === 0 }}
        onChange={(ev) => props.setter(applyStoreProperty(props.cfg, 'agnai.model', ev.value))}
      />

      <Select
        fieldName="agnaiSampler"
        items={samplers()}
        label={`Sampler`}
        value={props.cfg.agnai?.sampler}
        onChange={(ev) => props.setter(applyStoreProperty(props.cfg, 'agnai.sampler', ev.value))}
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
                <Th>Clip Skip</Th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <Td>Recommended</Td>
                <Td>{model()?.init.steps}</Td>
                <Td>{model()?.init.cfg}</Td>
                <Td>{model()?.init.width}</Td>
                <Td>{model()?.init.height}</Td>
                <Td>{model()?.init.clipSkip || ''}</Td>
              </tr>

              <tr>
                <Td>Limits</Td>
                <Td>{model()?.limit.steps}</Td>
                <Td>{model()?.limit.cfg}</Td>
                <Td>{model()?.limit.width}</Td>
                <Td>{model()?.limit.height}</Td>
                <Td>{model()?.limit.clipSkip || ''}</Td>
              </tr>

              <Show when={model()?.init.prefix}>
                <tr>
                  <Td span={6}>
                    <div class="flex flex-col gap-2">
                      <Show when={model()?.init.sampler}>
                        <TextInput
                          variant="outline"
                          disabled
                          prelabel="Sampler"
                          value={(SD_SAMPLER_REV as any)[model()?.init.sampler!]}
                        />
                      </Show>
                      <TextInput
                        variant="outline"
                        disabled
                        prelabel="Prefix"
                        value={model()?.init.prefix}
                      />
                      <TextInput
                        variant="outline"
                        disabled
                        prelabel="Suffix"
                        value={model()?.init.suffix}
                      />
                      <TextInput
                        variant="outline"
                        disabled
                        prelabel="Negative"
                        value={model()?.init.negative}
                      />
                    </div>
                  </Td>
                </tr>
              </Show>
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
const Td: Component<{ children?: any; span?: number }> = (props) => (
  <td
    class="rounded-md border-[var(--bg-700)] p-2 "
    colSpan={props.span}
    classList={{ border: !!props.children }}
  >
    {props.children}
  </td>
)
