import { Component, createEffect, createSignal } from 'solid-js'
import { getAdapter, getChatPreset } from '../../../../common/prompt'
import { Encoder, getEncoder } from '../../../../common/tokenize'
import Modal from '../../../shared/Modal'
import TextInput from '../../../shared/TextInput'
import { chatStore, presetStore, userStore } from '../../../store'

const PromptModal: Component = () => {
  const user = userStore()
  const state = chatStore((s) => ({ prompt: s.prompt, chat: s.active?.chat }))
  const presets = presetStore()
  const [tokens, setTokens] = createSignal<number>(0)

  createEffect(() => {
    if (!state.chat) return
    if (!user.user) return

    const preset = getChatPreset(state.chat, user.user, presets.presets)
    const { adapter, model } = getAdapter(state.chat, user.user, preset)
    const encoder = getEncoder(adapter, model)
    setTokens(encoder(state.prompt?.prompt || ''))
  })

  return (
    <Modal
      show={!!state.prompt}
      close={chatStore.closePrompt}
      title="Message Prompt"
      maxWidth="half"
    >
      <TextInput
        class="min-h-[300px] text-sm"
        fieldName="prompt"
        label="Prompt"
        helperText={
          <div class="flex flex-col gap-2">
            <div>
              This is an approximation. It may differ from the prompt actually used at the time. For
              authenticated users, the prompt generated on the server may contain more context as it
              retrieves messages from the database until the 'history' portion of your prompt is
              full. OpenAI Turbo has a different payload and is generated server-side only.
            </div>
            <div>
              The entire 'budget' may not get used here as token counts may change due to
              formatting. E.g. OpenAI Turbo payloads are split into multiple messages which
              drastically alters token counts.
            </div>
            <div class="font-bold">Est. tokens: {tokens()}</div>
          </div>
        }
        value={state.prompt?.prompt}
        isMultiline
        disabled
      />
    </Modal>
  )
}

export default PromptModal
