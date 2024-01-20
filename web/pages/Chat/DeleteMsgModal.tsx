import { Component, Show, createMemo } from 'solid-js'
import Button from '../../shared/Button'
import Modal from '../../shared/Modal'
import { msgStore } from '../../store'
import { useTransContext } from '@mbarzda/solid-i18next'

const DeleteMsgModal: Component<{ messageId: string; show: boolean; close: () => void }> = (
  props
) => {
  const [t] = useTransContext()

  const state = msgStore((s) => ({
    msgs: s.msgs,
    msg: s.msgs.find((msg) => msg._id === props.messageId),
  }))

  const count = createMemo(() =>
    state.msg?.adapter === 'image'
      ? 1
      : state.msgs.length - state.msgs.findIndex(byId(props.messageId))
  )

  const confirm = (one?: boolean) => {
    const deleteOne = one || state.msg?.adapter === 'image'
    msgStore.deleteMessages(props.messageId, deleteOne)
    props.close()
  }

  return (
    <Modal
      title={t('confirm_delete')}
      show={props.show}
      close={props.close}
      footer={
        <>
          <Button schema="secondary" onClick={props.close}>
            {t('cancel')}
          </Button>
          <Show when={count() > 1 && state.msg?.adapter !== 'image'}>
            <Button onClick={() => confirm(true)}>{t('delete_one')}</Button>
          </Show>
          <Button schema="red" onClick={() => confirm(false)}>
            {t('delete_x', { count: count() })}
          </Button>
        </>
      }
    >
      <Show when={state.msg?.adapter !== 'image'}>
        {t('are_you_sure_you_wish_to_delete_messages?', { count: count() })}
        <Show when={count() > 1}>
          <br />
          {t('deleting_one_will_delete_the_selected_message_only')}
        </Show>
      </Show>
      <Show when={state.msg?.adapter === 'image'}>
        {t('are_you_sure_you_wish_to_delete_image_message?')}
      </Show>
    </Modal>
  )
}

export default DeleteMsgModal

function byId(id: string) {
  return (obj: { _id: string }) => obj._id === id
}
