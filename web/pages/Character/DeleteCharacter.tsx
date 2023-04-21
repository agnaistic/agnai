import { Trash, X } from 'lucide-solid'
import { Component, Show, createEffect } from 'solid-js'
import { AppSchema } from '../../../srv/db/schema'
import AvatarIcon from '../../shared/AvatarIcon'
import Button from '../../shared/Button'
import Modal from '../../shared/Modal'
import { characterStore, chatStore } from '../../store'

const DeleteCharacterModal: Component<{
  char?: Pick<AppSchema.Character, '_id' | 'name' | 'avatar'>
  show: boolean
  close: () => void
}> = (props) => {
  const chats = chatStore((s) => ({ charId: s.char?.char._id, count: s.char?.chats.length || 0, loaded: s.loaded }))

  const onDelete = () => {
    const charId = props.char?._id
    if (!charId) return
    characterStore.deleteCharacter(charId, props.close)
  }

  createEffect(() => {
    const charId = props.char?._id
    if (!charId) return
    if (props.char?._id === chats.charId) return
    chatStore.getBotChats(charId)
  })

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
        <Show when={!chats.loaded}>
          <div class="font-bold">Verifying chats...</div>
        </Show>
        <Show when={chats.loaded && chats.count === 0}>
          <div>You have no chats with this character.</div>
        </Show>
        <Show when={chats.count > 0}>
          <div class="font-bold">This will delete all chats ({chats.count}) with this character!</div>
        </Show>
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
