import { Download } from 'lucide-solid'
import { Component, createMemo } from 'solid-js'
import Button from '../../shared/Button'
import Modal from '../../shared/Modal'
import { chatStore, msgStore } from '../../store'

const ChatExport: Component<{ show: boolean; close: () => void }> = (props) => {
  const chats = chatStore.getState()
  const msgs = msgStore.getState()

  const json = createMemo(() => {
    const chat = chats.active?.chat
    const messages = msgs.messageHistory.concat(msgs.msgs)

    const json = {
      name: 'Exported',
      greeting: chat?.greeting || '',
      sampleChat: chat?.sampleChat || '',
      scenario: chat?.scenario || '',
      treeLeafId: chat?.treeLeafId,
      messages: messages.map((msg) => ({
        _id: msg._id.slice(0, 8),
        createdAt: msg.createdAt,
        json: msg.json,
        extras: msg.extras,
        ooc: msg.ooc,
        values: msg.values,
        parent: msg.parent ? msg.msg.slice(0, 8) : undefined,
        handle: msg.characterId
          ? chats.allChars.map[msg.characterId!]?.name
          : msg.userId
          ? chats.memberIds[msg.userId]?.handle || 'You'
          : undefined,
        userId: msg.userId ? msg.userId : undefined,
        characterId: msg.characterId === chat?.characterId ? 'imported' : msg.characterId,
        name: chats.allChars.map[msg.characterId!]?.name || chats.memberIds[msg.userId!]?.handle,
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

  return <Modal show={props.show} close={props.close} title="Export Chat" footer={Footer}></Modal>
}

export default ChatExport
