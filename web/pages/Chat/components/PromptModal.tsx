import { Component } from 'solid-js'
import Modal from '../../../shared/Modal'
import TextInput from '../../../shared/TextInput'
import { chatStore } from '../../../store'

const PromptModal: Component = () => {
  const state = chatStore((s) => ({ prompt: s.prompt }))

  return (
    <Modal
      show={!!state.prompt}
      close={chatStore.closePrompt}
      title="Message Prompt"
      maxWidth="full"
    >
      <TextInput
        class="min-h-[300px] text-sm"
        fieldName="prompt"
        label="Prompt"
        helperText="This is an approximation. It may differ from the prompt actually used at the time."
        value={state.prompt?.prompt}
        isMultiline
        disabled
      />
    </Modal>
  )
}

export default PromptModal
