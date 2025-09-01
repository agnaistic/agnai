import { Component, createMemo, Show } from 'solid-js'
import RangeInput from '../RangeInput'
import { Toggle } from '../Toggle'
import { userStore } from '../../store'
import { PhraseBias, StoppingStrings } from '../PhraseBias'
import { BUILTIN_FORMATS } from '/common/presets/templates'
import { getSubscriptionModelLimits } from '/common/util'
import { ContextSize, ModelFormat, ResponseLength, Temperature } from './Fields'
import { PresetTabProps } from '/web/store/preset-context'

export const MODEL_FORMATS = Object.keys(BUILTIN_FORMATS).map((label) => ({ label, value: label }))

export const GeneralSettings: Component<PresetTabProps> = (props) => {
  const user = userStore((s) => ({ user: s.user, userLevel: s.userLevel }))

  const subMax = createMemo(() => {
    const level = user.user?.admin ? Infinity : user.userLevel
    const match = getSubscriptionModelLimits(props.sub?.preset, level)
    if (match) return match

    return {
      level,
      maxTokens: props.sub?.preset.maxTokens,
      maxContextLength: props.sub?.preset.maxContextLength,
    }
  })

  return (
    <div class="flex flex-col gap-2" classList={{ hidden: props.tab !== 'General' }}>
      <ModelFormat state={props.state} setters={props.setters} sub={props.sub} page={props.page} />

      <Toggle
        fieldName="localRequests"
        label="Use Local Requests"
        helperMarkdown={`When enabled your browser will make requests instead of Agnaistic.\n**NOTE**: Your chat will not support multiplayer.`}
        service={props.setters.context.service}
        format={props.setters.context.format}
        hide={props.setters.hides.localRequests || !!props.state.providerId}
        value={props.state.localRequests}
        onChange={(ev) => props.setters.setState('localRequests', ev)}
      />

      <Toggle
        fieldName="thirdPartyUrlNoSuffix"
        label="Disable Auto-URL"
        helperText="No paths will be added to your URL."
        value={props.state.thirdPartyUrlNoSuffix}
        service={props.setters.context.service}
        hide={
          props.setters.hides.thirdPartyFormat ||
          props.setters.context.format === 'featherless' ||
          props.setters.context.format === 'arli'
        }
        onChange={(ev) => props.setters.setState('thirdPartyUrlNoSuffix', ev)}
      />

      {/* <Show when={props.context.service === 'horde'}>
        <Card>
          <HordeDetails
            maxTokens={props.state.maxTokens}
            maxContextLength={props.state.maxContextLength!}
          />
        </Card>
      </Show> */}

      <div class="flex flex-col gap-2">
        <Show
          when={
            props.setters.context.service === 'kobold' &&
            props.setters.context.format === 'aphrodite'
          }
        >
          <RangeInput
            fieldName="swipesPerGeneration"
            label="Swipes Per Generation"
            helperText="Number of responses (in swipes) that should generate."
            min={1}
            max={10}
            step={1}
            value={props.state.swipesPerGeneration || 1}
            disabled={props.state.disabled}
            onChange={(ev) => props.setters.setState('swipesPerGeneration', ev)}
          />
        </Show>

        <ResponseLength
          state={props.state}
          setters={props.setters}
          sub={props.sub}
          subMax={subMax()}
          page={props.page}
        />

        <ContextSize
          state={props.state}
          setters={props.setters}
          sub={props.sub}
          subMax={subMax()}
          page={props.page}
        />

        <Temperature {...props} />

        <RangeInput
          fieldName="minP"
          label="Min P"
          helperText="Used to discard tokens with the probability under a threshold (min_p) in the sampling process. Higher values will make text more predictable. (Put this value on 0 to disable its effect)"
          min={0}
          max={1}
          step={0.01}
          value={props.state.minP ?? 0}
          disabled={props.state.disabled}
          aiSetting={'minP'}
          recommended={props.sub?.preset.minP}
          onChange={(ev) => props.setters.setState('minP', ev)}
        />

        <Toggle
          fieldName="streamResponse"
          label="Stream Response"
          helperText="Stream the response as it is generated"
          value={props.state.streamResponse ?? false}
          disabled={props.state.disabled}
          onChange={(ev) => props.setters.setState('streamResponse', ev)}
        />
        <StoppingStrings
          state={props.state}
          setters={props.setters}
          sub={props.sub}
          page={props.page}
        />
        <Toggle
          fieldName="disableNameStops"
          label="Disable Name Stops"
          helperText="Disable automatic character names stopping strings"
          value={props.state.disableNameStops}
          onChange={(ev) => props.setters.setState('disableNameStops', ev)}
        />

        <PhraseBias state={props.state} setters={props.setters} sub={props.sub} page={props.page} />
      </div>
    </div>
  )
}
