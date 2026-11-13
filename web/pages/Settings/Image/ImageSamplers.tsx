import { Component } from 'solid-js'
import { ImageContext } from './image-context'
import { InlineRangeInput } from '/web/shared/RangeInput'
import TextInput from '/web/shared/TextInput'
import { Toggle } from '/web/shared/Toggle'

export const ImageSamplers: Component<{ ctx: ImageContext }> = (props) => {
  return (
    <div class="flex flex-col gap-4">
      <TextInput
        value={props.ctx.edit.preset.name}
        label="Preset Name"
        placeholder={`Name of this image preset`}
        onChange={(ev) => props.ctx.updatePreset({ name: ev.currentTarget.value })}
      />

      <InlineRangeInput
        fieldName="imageSteps"
        min={5}
        max={128}
        step={1}
        value={props.ctx.edit.preset.steps ?? props.ctx.state.agnaiModel?.init.steps ?? 50}
        label="Sampling Steps"
        onChange={(ev) => props.ctx.updatePreset({ steps: ev })}
      />

      <InlineRangeInput
        fieldName="imageClipSkip"
        min={0}
        max={4}
        step={1}
        value={props.ctx.edit.preset.clipSkip ?? props.ctx.state.agnaiModel?.init.clipSkip ?? 0}
        label="Clip Skip"
        onChange={(ev) => props.ctx.updatePreset({ clipSkip: ev })}
      />

      <InlineRangeInput
        fieldName="imageWidth"
        min={512}
        max={128 * 12}
        step={128}
        value={props.ctx.edit.preset.width ?? props.ctx.state.agnaiModel?.init.width ?? 1024}
        label="Image Width"
        onChange={(ev) => props.ctx.updatePreset({ width: ev })}
      />

      <InlineRangeInput
        fieldName="imageHeight"
        min={512}
        max={128 * 12}
        step={128}
        value={props.ctx.edit.preset.height ?? props.ctx.state.agnaiModel?.init.height ?? 1024}
        label="Image Height"
        onChange={(ev) => props.ctx.updatePreset({ height: ev })}
      />

      <InlineRangeInput
        fieldName="imageCfg"
        value={props.ctx.edit.preset.cfg ?? props.ctx.state.agnaiModel?.init.cfg ?? 9}
        label="Guidance Scale"
        min={1}
        max={10}
        step={0.1}
        onChange={(ev) => props.ctx.updatePreset({ cfg: ev })}
      />

      <Toggle
        label="Auto-santisize Prompt"
        helperText="Prompts have underscores replaced and excess whitespace/commas removed"
        value={props.ctx.edit.preset.autofix ?? false}
        onChange={(ev) => props.ctx.updatePreset({ autofix: ev })}
      />

      <TextInput
        fieldName="seed"
        value={props.ctx.edit.preset.seed ?? 0}
        label="Seed"
        type="number"
        helperText="Seed number (0 = random). Note: The seed will not be consistent across different servers."
        onChange={(ev) =>
          props.ctx.updatePreset({
            seed: Math.max(0, Math.min(+ev.currentTarget.value, Number.MAX_SAFE_INTEGER)),
          })
        }
      />

      <TextInput
        fieldName="imagePrefix"
        value={props.ctx.edit.preset.prefix}
        label="Prompt Prefix"
        helperText="(Optional) Text to prepend to your image prompt"
        placeholder={`E.g.: best quality, masterpiece`}
        onChange={(ev) => props.ctx.updatePreset({ prefix: ev.currentTarget.value })}
      />

      <TextInput
        fieldName="imageSuffix"
        value={props.ctx.edit.preset.suffix}
        label="Prompt Suffix"
        helperText="(Optional) Text to append to your image prompt"
        placeholder={`E.g.: full body, visible legs, dramatic lighting`}
        onChange={(ev) => props.ctx.updatePreset({ suffix: ev.currentTarget.value })}
      />

      <TextInput
        fieldName="imageNegative"
        label="Negative Prompt"
        helperText="(Optional) Negative Prompt"
        placeholder={`E.g.: painting, drawing, illustration, glitch, deformed, mutated, cross-eyed, disfigured`}
        value={props.ctx.edit.preset.negative}
        onChange={(ev) => props.ctx.updatePreset({ negative: ev.currentTarget.value })}
      />
    </div>
  )
}
