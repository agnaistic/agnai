import { Component } from 'solid-js'
import { AppSchema } from '/common/types/schema'
import Modal from '../../shared/Modal'

type Props = { avatar: AppSchema.Character | AppSchema.Chat; show: boolean; close: () => void }

export const GenerateAvatarModal: Component<Props> = (props) => {
  return (
    <Modal show={props.show} close={props.close} title="Generate Avatar">
      Not yet implemented
    </Modal>
  )
}
