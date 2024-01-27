import { Component } from 'solid-js'
import { AppSchema } from '/common/types/schema'
import Modal from '../../shared/Modal'
import { useTransContext } from '@mbarzda/solid-i18next'

type Props = { avatar: AppSchema.Character | AppSchema.Chat; show: boolean; close: () => void }

export const GenerateAvatarModal: Component<Props> = (props) => {
  const [t] = useTransContext()

  return (
    <Modal show={props.show} close={props.close} title={t('generate_avatar')}>
      {t('not_yet_implemented')}
    </Modal>
  )
}
