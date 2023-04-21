import { Trash, X } from 'lucide-solid'
import { Component } from 'solid-js'
import { AppSchema } from '../../../srv/db/schema'
import AvatarIcon from '../../shared/AvatarIcon'
import Button from '../../shared/Button'
import Modal from '../../shared/Modal'
import { characterStore } from '../../store'

const DeleteCharacterModal: Component<{
  char?: Pick<AppSchema.Character, '_id' | 'name' | 'avatar'>
  show: boolean
  close: () => void
}> = (props) => {
  const onDelete = () => {
    if (!props.char) return
    characterStore.deleteCharacter(props.char._id, props.close)
  }
  return (
    <Modal
      show={props.show && !!props.char}
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
        <div class="font-bold">
          This will delete all of the chats associated with this character!
        </div>
        <div>Are you sure you wish to delete this character?</div>
        <div class="flex justify-center gap-4">
          <AvatarIcon avatarUrl={props.char!.avatar} />
          {props.char!.name}
        </div>
      </div>
    </Modal>
  )
}

export default DeleteCharacterModal
