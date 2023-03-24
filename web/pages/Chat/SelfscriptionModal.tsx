import { Component } from 'solid-js'
import Button from '../../shared/Button'
import Modal from '../../shared/Modal'

const SelfscriptionModal: Component<{ show: boolean; close: () => void }> = (props) => {
  const confirm = () => {
    props.close()
  }

  return (
    <Modal
      title="Selfscription Warning"
      show={props.show}
      close={props.close}
      footer={
        <>
          <Button onClick={confirm}>Okay</Button>
        </>
      }
    >
      <p class="text-xl text-red-500">
        Character (probably) contains definitions for the user! you might want to not include your
        selfscription.
      </p>
    </Modal>
  )
}

export default SelfscriptionModal

function byId(id: string) {
  return (obj: { _id: string }) => obj._id === id
}
