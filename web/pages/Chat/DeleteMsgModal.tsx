import { Component, Show, createMemo } from 'solid-js'
import Button from '../../shared/Button'
import Modal from '../../shared/Modal'
import { msgStore } from '../../store'
import { useAppContext } from '/web/store/context'

const DeleteMsgModal: Component<{ messageId: string; show: boolean; close: () => void }> = (
  props
) => {
  const [ctx] = useAppContext()

  const message = createMemo(() => ctx.messages.path.find((m) => m._id === props.messageId))

  const count = createMemo(() => {
    const msg = message()
    const amount =
      msg?.adapter === 'image'
        ? 1
        : ctx.messages.path.length - ctx.messages.path.findIndex(byId(props.messageId))
    return amount
  })

  const confirm = (one?: boolean) => {
    const deleteOne = one || message()?.adapter === 'image'
    msgStore.deleteMessages(props.messageId, deleteOne)
    props.close()
  }

  return (
    <Modal
      title="Confirm Delete"
      show={props.show}
      close={props.close}
      footer={
        <>
          <Button schema="secondary" onClick={props.close}>
            Cancel
          </Button>
          <Show when={!!message()?.retries?.length}>
            <Button onClick={() => msgStore.discardSwipe(props.messageId, 0, props.close)}>
              Delete Swipe
            </Button>
          </Show>
          <Show when={count() > 1 && message()?.adapter !== 'image'}>
            <Button onClick={() => confirm(true)}>Delete One</Button>
          </Show>
          <Button schema="red" onClick={() => confirm(false)}>
            Delete {count()}
          </Button>
        </>
      }
    >
      <Show when={message()?.adapter !== 'image'}>
        Are you sure you wish to delete the one or the last {count()} messages?
        <Show when={count() > 1}>
          <br />
          Deleting "one" will only delete the selected message.
        </Show>
      </Show>
      <Show when={message()?.adapter === 'image'}>
        Are you sure you wish to delete 1 image message?
      </Show>
    </Modal>
  )
}

export default DeleteMsgModal

function byId(id: string) {
  return (obj: { _id: string }) => obj._id === id
}
