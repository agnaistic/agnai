import { Download } from 'lucide-solid'
import { Component, createMemo } from 'solid-js'
import Button from '../../shared/Button'
import Modal from '../../shared/Modal'
import { chatStore, msgStore } from '../../store'
import { Trans, useTransContext } from '@mbarzda/solid-i18next'

const ChatExport: Component<{ show: boolean; close: () => void }> = (props) => {
  const [t] = useTransContext()

  const chats = chatStore()
  const msgs = msgStore()

  const json = createMemo(() => {
    const chat = chats.active?.chat
    const messages = msgs.msgs.slice()

    const json = {
      name: t('exported'),
      greeting: chat?.greeting || '',
      sampleChat: chat?.sampleChat || '',
      scenario: chat?.scenario || '',
      messages: messages.map((msg) => ({
        handle: msg.userId ? chats.memberIds[msg.userId]?.handle || 'You' : undefined,
        userId: msg.userId ? msg.userId : undefined,
        characterId: msg.characterId ? 'imported' : undefined,
        msg: msg.msg,
        state: msg.state,
      })),
    }

    return encodeURIComponent(JSON.stringify(json, null, 2))
  })

  const Footer = (
    <>
      <Button schema="secondary" onClick={props.close}>
        {t('close')}
      </Button>
      <a
        href={`data:text/json:charset=utf-8,${json()}`}
        download={`chat-${chats.active?.chat._id.slice(0, 4)}.json`}
        onClick={props.close}
      >
        <Button>
          <Download /> {t('download')}
        </Button>
      </a>
    </>
  )

  return (
    <Modal show={props.show} close={props.close} title={t('export_chat')} footer={Footer}>
      <Trans key="export_chat_note">
        <p class="text-xl font-bold">Note</p>
        <p>This will only export the conversation that you currently have loaded.</p>
        <p>
          If you want to export the entire chat, you will need to scroll up in the chat until the
          entire conversation it loaded.
        </p>
      </Trans>
    </Modal>
  )
}

export default ChatExport
