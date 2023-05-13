import { Component, Show, createMemo } from 'solid-js'
import Button from '../../shared/Button'
import Modal from '../../shared/Modal'
import { msgStore } from '../../store'

const DeleteMsgModal: Component<{ messageId: string; show: boolean; close: () => void }> = (
  props
) => {
  const state = msgStore((s) => ({
    msgs: s.msgs,
    msg: s.msgs.find((msg) => msg._id === props.messageId),
  }))

  const count = createMemo(() => state.msgs.length - state.msgs.findIndex(byId(props.messageId)))

  const confirm = (one?: boolean) => {
    const deleteOne = one || state.msg?.adapter === 'image'
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
          <Show when={count() > 1}>
            <Button onClick={() => confirm(true)}>Delete One</Button>
          </Show>
          <Button onClick={() => confirm(false)}>Delete {count()}</Button>
        </>
      }
    >
      <Show when={state.msg?.adapter !== 'image'}>
        Are you sure wish to delete the one or the last {count()} messages?
        <br />
        Deleteing "one" will delete the selected message only.
      </Show>

      <Show when={state.msg?.adapter === 'image'}>
        Are you sure wish to delete 1 image message?
      </Show>
    </Modal>
  )
}

export default DeleteMsgModal

function byId(id: string) {
  return (obj: { _id: string }) => obj._id === id
}
