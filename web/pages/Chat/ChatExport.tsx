import { Download } from 'lucide-solid'
import { Component, createMemo } from 'solid-js'
import Button from '../../shared/Button'
import Modal from '../../shared/Modal'
import { chatStore, msgStore } from '../../store'

const ChatExport: Component<{ show: boolean; close: () => void }> = (props) => {
  const chats = chatStore()
  const msgs = msgStore()

  const json = createMemo(() => {
    const chat = chats.active?.chat
    const messages = msgs.msgs.slice()

    const json = {
      name: 'Exported',
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
        Close
      </Button>
      <a
        href={`data:text/json:charset=utf-8,${json()}`}
        download={`chat-${chats.active?.chat._id.slice(0, 4)}.json`}
        onClick={props.close}
      >
        <Button>
          <Download /> Download
        </Button>
      </a>
    </>
  )

  return (
    <Modal show={props.show} close={props.close} title="Export Chat" footer={Footer}>
      <p class="text-xl font-bold">Note</p>
      <p>This will only export the conversation that you currently have loaded.</p>
      <p>
        If you want to export the entire chat, you will need to scroll up in the chat until the
        entire conversation it loaded.
      </p>
    </Modal>
  )
}

export default ChatExport
