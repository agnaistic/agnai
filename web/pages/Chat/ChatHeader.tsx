import './chat-detail.css'
import { Component, createMemo } from 'solid-js'
import { ADAPTER_LABELS } from '../../../common/adapters'
import { ChatRightPane, chatStore } from '../../store'
import { ChatModal } from './ChatOptions'
import { usePaneManager } from '/web/shared/hooks'
import { ContextState } from '/web/store/context'
import { useSubNav } from '/web/subnav'
import { ChatCharacter, ChatNav } from './ChatNav'

export const ChatHeader: Component<{
  ctx: ContextState
  isOwner: boolean
}> = (props) => {
  const pane = usePaneManager()

  const togglePane = (paneType: ChatRightPane) => {
    chatStore.option({ options: false })
    pane.update(paneType)
  }

  const setModal = (modal: ChatModal) => {
    chatStore.option({ options: false, modal })
  }

  const adapterLabel = createMemo(() => {
    if (!props.ctx.info) return ''

    const { name, adapter, isThirdParty, presetLabel } = props.ctx.info
    const label = `${ADAPTER_LABELS[adapter]}${isThirdParty ? ' (3rd party)' : ''} - ${
      name || presetLabel
    }`
    return label
  })

  useSubNav({
    header: (
      <ChatCharacter ctx={props.ctx} togglePane={togglePane} setModal={setModal} adapterLabel="" />
    ),
    body: (
      <ChatNav
        ctx={props.ctx}
        togglePane={togglePane}
        setModal={setModal}
        adapterLabel={adapterLabel()}
      />
    ),
  })

  return null
}
