import { Component } from 'solid-js'
import { userStore } from '/web/store/user'
import { Save } from 'lucide-solid'
import Button from '/web/shared/Button'
import RangeInput, { InlineRangeInput } from '/web/shared/RangeInput'
import Select from '/web/shared/Select'
import { Card } from '/web/shared/Card'
import { Typewriter } from '../../Chat/components/Message'
import { FormLabel } from '/web/shared/FormLabel'
import { Toggle } from '/web/shared/Toggle'
import { settingStore } from '/web/store/settings'
import { promptStore } from '/web/store/prompt'
import { createEmitter } from '/web/shared/util'
import { neat } from '/common/util'

export const ChatUISettings: Component = (props) => {
  const state = userStore((s) => ({ ui: s.ui }))

  const settings = settingStore((s) => ({ anonymize: s.anonymize }))
  const prompts = promptStore((s) => ({ hintsEnabled: s.hintsEnabled }))

  const twReset = createEmitter('reset')

  return (
    <>
      {' '}
      <Toggle
        label="Response Hints"
        helperText="Add a hint to your message to guide the response"
        value={prompts.hintsEnabled}
        onChange={(ev) => promptStore.toggleHints(ev)}
      />
      <Toggle
        fieldName="imageWrap"
        label="Avatar Wrap Around"
        helperText='Allow text in messages to "wrap around" avatars'
        onChange={(value) => userStore.saveUI({ imageWrap: value })}
        value={state.ui.imageWrap}
      />
      <Toggle
        label="Trim Incomplete Sentences"
        fieldName="trimSentences"
        value={state.ui.trimSentences ?? false}
        onChange={(next) => userStore.saveUI({ trimSentences: next })}
      />
      <Toggle
        label="Expand Reasoning by Default"
        helperText="Reasoning thoughts are collapsed by default. Enable this to expand them by default."
        fieldName="expandReasoning"
        value={state.ui.expandReasoning ?? false}
        onChange={(next) => userStore.saveUI({ expandReasoning: next })}
      />
      <Select
        items={[
          { value: '', label: 'Default (All)' },
          { value: 'all', label: 'All' },
          { value: 'post', label: 'After Thought' },
          { value: 'pre', label: 'Before Thought' },
        ]}
        label="Mid-Reasoning Behavior"
        helperMarkdown={neat`When reasoning is in the middle of a response, which utterance (i.e., non-thought) should be kept`}
        value={state.ui.displayReasoning}
        onChange={(next) => userStore.saveUI({ displayReasoning: next.value as any })}
      />
      <Toggle
        value={settings.anonymize}
        label="Anonymize Chat"
        helperText="Hide profile name in conversations. Typically for screenshots."
        onChange={() => settingStore.toggleAnonymize()}
      />
      <Toggle
        fieldName="mobileSendOnEnter"
        label="Send on Enter on Mobile"
        helperText='Instead of adding a line break, "Enter" will send the message (Mobile only)'
        value={state.ui.mobileSendOnEnter}
        onChange={(ev) => userStore.saveUI({ mobileSendOnEnter: ev })}
      />
      <Card border class="!my-1 !px-2 !py-1">
        <div class="flex w-full flex-col">
          <div class="flex gap-1">
            <InlineRangeInput
              label="Text Speed"
              parentClass="w-full"
              // helperMarkdown='Speed of the "typewriter" effect when receiving new messages. Set to `0` to disable.'
              value={state.ui.textSpeed ?? 0}
              min={0}
              max={100}
              step={1}
              onChange={(ev) => {
                userStore.tryUI({ textSpeed: ev })
                twReset.emit.reset()
              }}
            />
            <Button
              size="sm"
              class="!py-2"
              onClick={() => userStore.saveUI({ textSpeed: state.ui.textSpeed })}
            >
              Save
            </Button>
          </div>
          <FormLabel helperMarkdown="Control the speed that text streams in. Set to `0` to disable." />

          <Typewriter
            class="!text-700 text-sm"
            text="There are ten types of people in the world. Those who understand binary and those who don't."
            speed={state.ui.textSpeed}
            reset={twReset}
          />
        </div>
      </Card>
      {/* <Toggle
        fieldName="contextWindowLine"
        label="Show context window delineator"
        helperText="Shows a dotted line above which messages are no longer inserted in the prompt"
        value={state.ui.contextWindowLine}
        onChange={(ev) => userStore.saveUI({ contextWindowLine: ev })}
        /> */}
      <Select
        fieldName="chatMode"
        label="View Mode"
        helperText={
          <>
            <b>Standard</b>: Messages take up the entire chat screen.
            <br />
            <b>Split</b>: Character's avatar appears at the top of the screen
            <br />
            <b>Background</b>: Character's avatar will become the Chat Background
          </>
        }
        items={[
          { label: 'Standard', value: 'standard' },
          { label: 'Split', value: 'split' },
          { label: 'Background: Auto', value: 'background' },
          { label: 'Background: Cover', value: 'background-cover' },
          { label: 'Background: Contain', value: 'background-contain' },
        ]}
        value={state.ui.viewMode || 'standard'}
        onChange={(next) => userStore.saveUI({ viewMode: next.value as any })}
      />
      <div class="flex w-full items-center justify-between gap-2">
        <RangeInput
          parentClass="w-full"
          fieldName="chatModeHeight"
          min={25}
          max={65}
          step={1}
          label="Split Height (%)"
          helperText={`Maximum height of the character's avatar when in split mode`}
          value={state.ui.viewHeight || 40}
          onChange={(value) => userStore.tryUI({ viewHeight: value })}
        />
        <Button onClick={() => userStore.saveUI({ viewHeight: state.ui.viewHeight || 40 })}>
          <Save />
        </Button>
      </div>
    </>
  )
}
