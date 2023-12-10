import { Component, For } from 'solid-js'
import { gameStore } from './state'
import Modal from '/web/shared/Modal'

const LoadModal: Component<{ close: () => void }> = (props) => {
  const sessions = gameStore((g) => g.sessions.filter((s) => s.gameId === g.template._id))

  return (
    <Modal maxWidth="half" show close={props.close}>
      <div class="flex flex-col gap-1">
        <For each={sessions}></For>
      </div>
    </Modal>
  )
}
