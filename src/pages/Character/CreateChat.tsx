import { Check, X } from 'lucide-solid'
import { Component, Show } from 'solid-js'
import Button from '../../shared/Button'
import Modal from '../../shared/Modal'
import { chatStore } from '../../store'

const CreateChatModal: Component<{ show: boolean; onClose: () => void }> = (props) => {
  const state = chatStore()

  const Footer = (
    <>
      <Button schema="secondary" onClick={props.onClose}>
        <X />
        Close
      </Button>

      <Button>
        <Check />
        Create
      </Button>
    </>
  )

  return (
    <Modal
      show={props.show}
      title={`Create Conversation with ${state.chats?.character.name}`}
      footer={Footer}
    >
      Create
    </Modal>
  )
}

export default CreateChatModal
