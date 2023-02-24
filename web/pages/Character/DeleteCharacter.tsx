import { Trash, X } from 'lucide-solid'
import { Component } from 'solid-js'
import { AppSchema } from '../../../srv/db/schema'
import AvatarIcon from '../../shared/AvatarIcon'
import Button from '../../shared/Button'
import Modal, { ModalFooter } from '../../shared/Modal'

const DeleteCharacterModal: Component<{
  char: AppSchema.Character
  show: boolean
  close: () => void
}> = (props) => {
  return (
    <Modal show={props.show} title="Confirm Deletion">
      <div class="flex flex-col gap-2">
        <div>Are you sure you wish to delete this character?</div>
        <div>
          <AvatarIcon avatarUrl={props.char.avatar} />
          {props.char.name}
        </div>
        <ModalFooter>
          <Button>
            <X />
            Cancel
          </Button>

          <Button>
            <Trash /> Delete
          </Button>
        </ModalFooter>
      </div>
    </Modal>
  )
}

export default DeleteCharacterModal
