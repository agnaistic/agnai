import { Component } from 'solid-js'
import Button from '../../shared/Button'
import Modal, { ModalFooter } from '../../shared/Modal'
import { msgStore } from '../../store/message'

const DeleteMsgModal: Component<{ messageId: string; show: boolean; close: () => void }> = (
  props
) => {
  const state = msgStore()

  const confirm = () => {
    msgStore.deleteMessages(props.messageId)
    props.close()
  }

  return (
    <Modal title="Confirm Delete" show={props.show} close={props.close}>
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
