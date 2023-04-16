import { Component, createSignal } from 'solid-js'
import { NOVEL_IMAGE_MODEL, NOVEL_SAMPLER, NOVEL_SAMPLER_REV } from '../../../../common/image'
import Divider from '../../../shared/Divider'
import RangeInput from '../../../shared/RangeInput'
import Select from '../../../shared/Select'
import TextInput from '../../../shared/TextInput'
import { userStore } from '../../../store'

const imageTabs = [
  { key: 'novel', name: 'NovelAI' },
  { key: 'horde', name: 'Horde' },
  { key: 'sd', name: 'SD' },
] as const

const imageTypes = [
  { label: 'Horde', value: 'horde' },
  { label: 'NovelAI', value: 'novel' },
  { label: 'Stable Diffusion', value: 'sd' },
]

export const ImageSettings: Component = () => {
  const state = userStore()

  const [currentType, setType] = createSignal(state.user?.images?.type || 'horde')

  return (
    <div>
      <form class="flex flex-col gap-4">
        <Select
          fieldName="type"
          items={imageTypes}
          value={state.user?.images?.type || 'horde'}
          onChange={(value) => setType(value.value as any)}
        />

        <RangeInput
          fieldName="steps"
          min={20}
          max={128}
          step={1}
          value={state.user?.images?.steps ?? 28}
          label="Sampling Steps"
          helperText="(Novel Anlas Threshold: 28)"
        />

        <RangeInput
          fieldName="width"
          min={256}
          max={1024}
          step={64}
          value={state.user?.images?.width ?? 384}
          label="Image Width"
          helperText="The larger the image, the less that can be retained in your local cache. (Novel Anlas Threshold: 512)"
        />

        <RangeInput
          fieldName="height"
          min={256}
          max={1024}
          step={64}
          value={state.user?.images?.height ?? 384}
          label="Image Height"
          helperText="The large the image, the less that can be retain in your local cache. (Novel Anlas Threshold: 512)"
        />

        <TextInput
          fieldName="cfg"
          value={state.user?.images?.height ?? 9}
          label="CFG Scale"
          helperText="Prompt Guidance. Classifier Free Guidance Scale - how strongly the image should conform to prompt - lower values produce more creative results."
        />

        <Divider />

        <NovelSettings />
      </form>
    </div>
  )
}

const NovelSettings: Component = () => {
  const state = userStore()

  const models = Object.entries(NOVEL_IMAGE_MODEL).map(([key, value]) => ({ label: key, value }))
  const samplers = Object.entries(NOVEL_SAMPLER).map(([key, value]) => ({
    label: value,
    value: key,
  }))
  return (
    <>
      <em>
        Note: The <b>Anlas Threshold</b> means anything above this value is cost Anlas credits
      </em>
      <Select fieldName="novelModel" items={models} label="Model" />
      <Select
        fieldName="novelSampler"
        items={samplers}
        label="Sampler"
        value={state.user?.images?.novel?.sampler || NOVEL_SAMPLER_REV.k_dpmpp_2m}
      />
    </>
  )
}
