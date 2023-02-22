import { Component, createEffect, createSignal } from 'solid-js'
import Button from '../../shared/Button'
import Modal, { ModalFooter } from '../../shared/Modal'
import { chatStore } from '../../store'

const DeleteMsgModal: Component<{ messageId: string; show: boolean; close: () => void }> = (
  props
) => {
  const state = chatStore((s) => ({
    msgs: s.msgs,
  }))

  const confirm = () => {
    chatStore.deleteMessages(props.messageId)
    props.close()
  }

  return (
    <Modal title="Confirm Delete" show={props.show}>
      Are you sure wish to delete the last{' '}
      {state.msgs.length - state.msgs.findIndex(byId(props.messageId))} messages?
      <ModalFooter>
        <Button schema="secondary" onClick={props.close}>
          Cancel
        </Button>
        <Button onClick={confirm}>Delete</Button>
      </ModalFooter>
    </Modal>
  )
}

export default DeleteMsgModal

function byId(id: string) {
  return (obj: { _id: string }) => obj._id === id
}
