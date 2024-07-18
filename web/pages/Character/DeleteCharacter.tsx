import { Archive, Trash, X } from 'lucide-solid'
import { Component } from 'solid-js'
import { AppSchema } from '../../../common/types/schema'
import { CharacterAvatar } from '../../shared/AvatarIcon'
import Button from '../../shared/Button'
import Modal from '../../shared/Modal'
import { characterStore } from '../../store'

const DeleteCharacterModal: Component<{
  char?: AppSchema.Character
  show: boolean
  close: () => void
}> = (props) => {
  const onDelete = () => {
    if (!props.char) return
    characterStore.deleteCharacter(props.char._id, props.close)
  }
  const onArchive = () => {
    if (!props.char) return
    if (props.char.tags?.includes('archived')) return
    characterStore.editPartialCharacter(
      props.char._id,
      { tags: props.char.tags?.concat('archived') ?? ['archived'] },
      props.close
    )
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

          <Button schema="secondary" onClick={onArchive}>
            <Archive /> Archive
          </Button>

          <Button schema="red" onClick={onDelete}>
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
          <CharacterAvatar char={props.char!} format={{ size: 'md', corners: 'circle' }} />
          {props.char!.name}
        </div>
      </div>
    </Modal>
  )
}

export default DeleteCharacterModal
