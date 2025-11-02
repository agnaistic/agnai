import { Component, createEffect, createMemo, createSignal, onMount } from 'solid-js'
import { getEncoder } from '../../../../common/tokenize'
import Modal from '../../../shared/Modal'
import TextInput from '../../../shared/TextInput'
import { chatStore, userStore } from '../../../store'
import { AppSchema, TokenCounter } from '/common/types'
import { useParticipantList } from '../util'
import CharacterSelect from '/web/shared/CharacterSelect'

const PromptModal: Component = () => {
  const user = userStore((s) => ({ user: s.user }))
  const state = chatStore((s) => ({ prompt: s.prompt, chat: s.details[s.lastChatId]?.chat }))
  const [encoder, setEncoder] = createSignal<TokenCounter>()
  const [tokens, setTokens] = createSignal(0)
  const lists = useParticipantList(true)

  const options = createMemo(() => {
    const all = lists()

    return all.chars.concat(all.tempsActive).concat(all.tempsInactive)
  })

  onMount(async () => {
    const enc = await getEncoder()
    setEncoder(() => enc)
  })

  createEffect(async () => {
    if (!state.chat) return '...'
    if (!user.user) return '....'
    if (!encoder()) return '.....'

    const count = await encoder()!(state.prompt?.template.parsed || '')
    setTokens(count)
  })

  const setPerspective = (char?: AppSchema.Character) => {
    if (!char) return
    chatStore.computePrompt(state.prompt?.msg!, char)
  }

  return (
    <Modal
      show={!!state.prompt?.shown}
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
            <div class="mb-1">
              <CharacterSelect
                horz="right"
                items={options()}
                fieldName="prompt-perspective"
                onChange={setPerspective}
              />
            </div>
          </div>
        }
        value={state.prompt?.template.parsed}
        isMultiline
        disabled
      />
    </Modal>
  )
}

export default PromptModal
