import { Component, createEffect, createSignal, on, onCleanup, Show } from 'solid-js'
import { userStore } from '/web/store/user'
import { characterStore } from '/web/store/character'
import { createDebounce, toDropdownItems } from '/web/shared/util'
import Select from '/web/shared/Select'
import { UI } from '/common/types'
import ColorPicker from '/web/shared/ColorPicker'
import Divider from '/web/shared/Divider'
import RangeInput from '/web/shared/RangeInput'
import { FormLabel } from '/web/shared/FormLabel'
import Sortable, { SortItem } from '/web/shared/Sortable'
import Message from '../../Chat/components/Message'
import { defaultUIsettings } from '/common/types/ui'
import { toInlineList } from './common'

export const MessageUISettings: Component = (props) => {
  const state = userStore((s) => ({
    ui: s.ui,
    current: s.current,
    profile: s.profile,
    user: s.user,
  }))

  const chars = characterStore((s) => ({
    characters: s.characters,
    impersonating: s.impersonating,
  }))

  const [tryCustomUI, unsubCustomUi] = createDebounce((update: Partial<UI.CustomUI>) => {
    userStore.tryCustomUI(update)
  }, 50)

  onCleanup(() => unsubCustomUi())

  const [inline, setInline] = createSignal<SortItem[]>([])

  createEffect(
    on(
      () => state.ui.msgOptsInline,
      (opts) => {
        if (inline().length) return

        setInline(toInlineList(opts))
      }
    )
  )

  const updateInline = (items: SortItem[]) => {
    const next = { ...defaultUIsettings.msgOptsInline }
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      next[item.value as UI.MessageOption] = {
        outer: !!item.enabled,
        pos: i,
      }
    }

    userStore.saveUI({ msgOptsInline: next })
    setInline(toInlineList(next))
  }

  return (
    <>
      {/* <div class="flex w-full items-center justify-between gap-2">
          <RangeInput
            parentClass="w-full"
            fieldName="chatAlternating"
            min={0}
            max={25}
            step={1}
            label="Message Alternating (%)"
            helperText={`Message bubble width reduction for alternating based on author`}
            value={state.ui.chatAlternating || 0}
            onChange={(value) => userStore.tryUI({ chatAlternating: value })}
          />
          <Button
            onClick={() => userStore.saveUI({ chatAlternating: state.ui.chatAlternating || 0 })}
          >
            <Save />
          </Button>
        </div> */}
      <div class="flex flex-row justify-start gap-4">
        <Select
          fieldName="avatarSize"
          label="Size"
          items={toDropdownItems(UI.AVATAR_SIZES)}
          value={state.ui.avatarSize}
          onChange={(item) => userStore.saveUI({ avatarSize: item.value as any })}
        />
        <Select
          fieldName="avatarCorners"
          label="Corner Radius"
          items={toDropdownItems(UI.AVATAR_CORNERS)}
          value={state.ui.avatarCorners}
          onChange={(item) => userStore.saveUI({ avatarCorners: item.value as any })}
        />
      </div>
      <ColorPicker
        label="Message Background Color"
        fieldName="messageColor"
        helperText={
          <span class="link" onClick={() => userStore.saveCustomUI({ msgBackground: 'bg-800' })}>
            Reset to Default
          </span>
        }
        onInput={(color) => tryCustomUI({ msgBackground: color })}
        onChange={(color) => userStore.saveCustomUI({ msgBackground: color })}
        value={state.current.msgBackground}
      />
      <ColorPicker
        label="Bot Message Background Color"
        fieldName="botMessageColor"
        helperText={
          <>
            <span class="link" onClick={() => userStore.saveCustomUI({ botBackground: 'bg-800' })}>
              Reset to Default
            </span>
          </>
        }
        onInput={(color) => tryCustomUI({ botBackground: color })}
        onChange={(color) => userStore.saveCustomUI({ botBackground: color })}
        value={state.current.botBackground}
      />
      <ColorPicker
        label="Chat Text Color"
        fieldName="chatTextColor"
        helperText={
          <span class="link" onClick={() => userStore.saveCustomUI({ chatTextColor: 'text-800' })}>
            Reset to Default
          </span>
        }
        onInput={(color) => tryCustomUI({ chatTextColor: color })}
        onChange={(color) => userStore.saveCustomUI({ chatTextColor: color })}
        value={state.current.chatTextColor}
      />
      <ColorPicker
        label="Chat Emphasis Color"
        fieldName="chatEmphasisColor"
        helperText={
          <span
            class="link"
            onClick={() => userStore.saveCustomUI({ chatEmphasisColor: 'text-600' })}
          >
            Reset to Default
          </span>
        }
        onInput={(color) => tryCustomUI({ chatEmphasisColor: color })}
        onChange={(color) => userStore.saveCustomUI({ chatEmphasisColor: color })}
        value={state.current.chatEmphasisColor}
      />
      <ColorPicker
        label="Chat Quote Color"
        fieldName="chatQuoteColor"
        helperText={
          <span class="link" onClick={() => userStore.saveCustomUI({ chatQuoteColor: 'text-800' })}>
            Reset to Default
          </span>
        }
        onInput={(color) => tryCustomUI({ chatQuoteColor: color })}
        onChange={(color) => userStore.saveCustomUI({ chatQuoteColor: color })}
        value={state.current.chatQuoteColor || '--text-800'}
      />
      <ColorPicker
        label="Chat Quote Emphasis Color"
        fieldName="chatQuoteEmphasisColor"
        helperText={
          <span
            class="link"
            onClick={() => userStore.saveCustomUI({ chatQuoteEmphasisColor: 'text-800' })}
          >
            Reset to Default
          </span>
        }
        onInput={(color) => tryCustomUI({ chatQuoteEmphasisColor: color })}
        onChange={(color) => userStore.saveCustomUI({ chatQuoteEmphasisColor: color })}
        value={state.current.chatQuoteEmphasisColor || '--text-800'}
      />
      <Select
        fieldName="chatQuoteEmphasisWeight"
        label="Chat Quote Emphasis Weight"
        inline
        items={[
          { label: 'None', value: 'unset' },
          { label: 'Bold', value: 'bold' },
        ]}
        onChange={(item) =>
          userStore.saveCustomUI({ chatQuoteEmphasisWeight: item.value as string })
        }
        value={state.current.chatQuoteEmphasisWeight || 'unset'}
      />
      <Select
        fieldName="chatWidth"
        label="Content Width"
        inline
        items={[
          { label: 'Narrow', value: 'narrow' },
          { label: 'Large', value: 'full' },
          { label: 'X-Large', value: 'xl' },
          { label: '2X-Large', value: '2xl' },
          { label: '3X-Large', value: '3xl' },
          { label: '100%', value: 'fill' },
        ]}
        onChange={(item) => userStore.saveUI({ chatWidth: item.value as any })}
        value={state.ui.chatWidth}
      />
      <RangeInput
        fieldName="msgOpacity"
        value={state.ui.msgOpacity}
        step={0.05}
        label="Message Opacity"
        helperText="The opacity of the message block in the chat window."
        min={0}
        max={1}
        onChange={(value) => userStore.saveUI({ msgOpacity: value })}
      />
      <Divider />
      <FormLabel
        label="Inline Message Options"
        helperText="Enable which message options appear 'inline' in a message. The rest will reside in the 'more options' drop menu"
      ></FormLabel>
      <Show when={inline().length > 0}>
        <Sortable items={inline()} onChange={updateInline} />
      </Show>
      <Divider />
      <div class="text-lg font-bold">Preview</div>
      <Show when={chars.characters.list.length > 0}>
        <div class="bg-600 flex w-full flex-col gap-2 rounded-md p-2">
          <Message
            index={-1}
            editing={false}
            messageId={'example-msg-1'}
            content={'*I wave excitedly* Hello world!\nHow are you today?'}
            characterId={chars.characters.list[0]?._id}
            onRemove={noop}
            sendMessage={() => {}}
            isPaneOpen={false}
            preset={undefined}
          />

          <Show when={state.profile}>
            <Message
              index={-1}
              editing={false}
              messageId={'example-msg-2'}
              content='*I wave back* Hi {{char}}!\nFancy meeting you here! I heard someone say "The weather is great today!"\n"How about we have some *fun* today?"'
              characterId={chars.impersonating?._id}
              userId={state.user?._id}
              onRemove={noop}
              sendMessage={() => {}}
              isPaneOpen={false}
              preset={undefined}
            />
          </Show>
        </div>
      </Show>
    </>
  )
}

function noop() {}
