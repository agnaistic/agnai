import { Component } from 'solid-js'
import Modal from '../Modal'

const MemoryBook: Component<{ show: boolean; close: () => void }> = (props) => {
  return (
    <Modal maxWidth="full" title="Memory Library" show={props.show} close={props.close}>
      In progress
    </Modal>
  )
}
