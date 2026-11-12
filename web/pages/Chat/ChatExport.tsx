import { Download } from 'lucide-solid'
import { Component, createMemo } from 'solid-js'
import Button from '../../shared/Button'
import Modal from '../../shared/Modal'
import { characterStore, chatStore, msgStore } from '../../store'
import { ChatTree } from '/common/chat'
import { useAppContext } from '/web/store/context'
import { downloadJson } from '/web/shared/util'

const ChatExport: Component<{ show: boolean; close: () => void }> = (props) => {
  const [ctx] = useAppContext()
  const chats = chatStore.getState()
  const chars = characterStore.getState().characters
  const msgs = msgStore.getState()

  const downloadableChat = createMemo(() => {
    const graph = msgs.graph
    const chat = ctx.active?.chat
    const messages = getAllMessasges(graph.tree)

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
        parent: msg.parent ? msg.parent.slice(0, 8) : undefined,
        handle: msg.characterId
          ? chars.map[msg.characterId!]?.name
          : msg.userId
          ? chats.memberIds[msg.userId]?.handle || 'You'
          : undefined,
        userId: msg.userId ? msg.userId : undefined,
        characterId: msg.characterId === chat?.characterId ? 'imported' : msg.characterId,
        name: chars.map[msg.characterId!]?.name || chats.memberIds[msg.userId!]?.handle,
        msg: msg.msg,
        state: msg.state,
      })),
    }

    return json
  })

  const download = () => {
    const chat = downloadableChat()
    downloadJson(chat, `chat-${ctx.active?.chat._id.slice(0, 4)}.json`)
  }

  const Footer = (
    <>
      <Button schema="secondary" onClick={props.close}>
        Close
      </Button>

      <Button onClick={download}>
        <Download /> Download
      </Button>
    </>
  )

  return <Modal show={props.show} close={props.close} title="Export Chat" footer={Footer}></Modal>
}

export default ChatExport

function getAllMessasges(tree: ChatTree) {
  const messages = Object.values(tree)
    .map((item) => item.msg)
    .sort((l, r) => l.createdAt.localeCompare(r.createdAt))
  return messages
}
