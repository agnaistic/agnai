import { JSX, createMemo } from 'solid-js'
import { characterStore, chatStore, userStore } from '/web/store'
import { getActiveBots } from '../util'
import { CharacterAvatar } from '/web/shared/AvatarIcon'

export function useChatAvatars() {
  const user = userStore()
  const chars = characterStore((s) => ({
    allBots: s.characters.list,
    botMap: s.characters.map,
    impersonate: s.impersonating,
  }))

  const chats = chatStore((s) => ({
    chat: s.active?.chat,
    chatChars: s.active?.chat.characters || {},
    char: s.active?.char,

    activeBots: getActiveBots(s.active?.chat!, chars.botMap),
  }))

  const format = createMemo(() => ({ size: user.ui.avatarSize, corners: user.ui.avatarCorners }))

  const avatars = createMemo((): Record<string, JSX.Element> => {
    if (!chats.chat || !chats.char) return {}
    const map: Record<string, JSX.Element> = {
      [chats.char._id]: <CharacterAvatar char={chats.char} format={format()} openable bot />,
    }

    for (const bot of chars.allBots) {
      if (bot._id in chats.chatChars === false) continue
      map[bot._id] = <CharacterAvatar char={bot} format={format()} openable bot />
    }

    return map
  })

  return { avatars }
}
