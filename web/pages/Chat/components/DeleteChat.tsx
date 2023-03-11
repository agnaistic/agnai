import { Trash, X } from 'lucide-solid'
import { Component } from 'solid-js'
import { AppSchema } from '../../../../srv/db/schema'
import Button from '../../../shared/Button'
import Modal from '../../../shared/Modal'
import { chatStore } from '../../../store'

const DeleteChatModal: Component<{
  chat?: AppSchema.Chat
  show: boolean
  close: () => void
}> = (props) => {
  const onDelete = () => {
    if (!props.chat) return
    chatStore.deleteChat(props.chat?._id,props.close)
  }
  return (
    <Modal
      show={props.show && !!props.chat}
      title="Confirm Deletion"
      close={props.close}
      footer={
        <>
          <Button schema="secondary" onClick={props.close}>
            <X />
            Cancel
          </Button>

          <Button onClick={onDelete}>
            <Trash /> Delete
          </Button>
        </>
      }
    >
      <div class="flex flex-col items-center gap-4">
        <div>Are you sure you wish to delete this chat?</div>
        <div class="flex justify-center gap-4">
          {props.chat!.name}
        </div>
      </div>
    </Modal>
  )
}

export default DeleteChatModal
