import { Archive, Trash, X } from 'lucide-solid'
import { Component } from 'solid-js'
import { AppSchema } from '../../../common/types/schema'
import { CharacterAvatar } from '../../shared/AvatarIcon'
import Button from '../../shared/Button'
import Modal from '../../shared/Modal'
import { characterStore } from '../../store'
import { useTransContext } from '@mbarzda/solid-i18next'

const DeleteCharacterModal: Component<{
  char?: AppSchema.Character
  show: boolean
  close: () => void
}> = (props) => {
  const [t] = useTransContext()

  const onDelete = () => {
    if (!props.char) return
    characterStore.deleteCharacter(props.char._id, props.close)
  }
  const onArchive = () => {
    if (!props.char) return
    if (props.char.tags?.includes('archived')) return
    characterStore.editCharacter(
      props.char._id,
      {
        tags: props.char.tags?.concat('archived') ?? ['archived'],
      },
      props.close
    )
  }
  return (
    <Modal
      show={props.show && !!props.char}
      title={t('confirm_deletion')}
      close={props.close}
      footer={
        <>
          <Button schema="secondary" onClick={props.close}>
            <X />
            {t('cancel')}
          </Button>

          <Button schema="secondary" onClick={onArchive}>
            <Archive /> {t('archive')}
          </Button>

          <Button schema="red" onClick={onDelete}>
            <Trash /> {t('delete')}
          </Button>
        </>
      }
    >
      <div class="flex flex-col items-center gap-4">
        <div class="font-bold">{t('this_will_delete_all_of_the_chats')}</div>
        <div>{t('are_you_sure_you_want_to_delete_this_character')}</div>
        <div class="flex justify-center gap-4">
          <CharacterAvatar char={props.char!} />
          {props.char!.name}
        </div>
      </div>
    </Modal>
  )
}

export default DeleteCharacterModal
