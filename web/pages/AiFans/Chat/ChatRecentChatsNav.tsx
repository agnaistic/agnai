import { createEffect } from 'solid-js'
import { chatStore } from '/web/store'
import { elapsedSince, getAssetUrl } from '/web/shared/util'
import ImageFill from '/web/shared/aifans/ImageFill'
import { A } from '@solidjs/router'

const RecentChatsSearch = () => {
  return (
    <div class="relative mt-3 font-clash">
      <form action="/search" method="get" id="search-form">
        <input
          type="text"
          name="query"
          class="h-[42px] w-full rounded-md border border-cosplay-gray-100 bg-[#fafafa]/10 px-6 focus:outline-none"
          placeholder="Search..."
        />
      </form>
    </div>
  )
}

const RecentChatItem = ({
  avatar,
  title,
  description,
  selected,
  id,
}: {
  avatar?: string
  title?: string
  description?: string
  selected?: boolean
  id?: string
}) => {
  return (
    <div>
      <A href={`/chat/${id}`}>
        <div
          class={`flex flex-row items-center rounded-md border ${
            selected ? 'border-cosplay-gray-100' : 'border-transparent'
          }`}
        >
          {avatar && (
            <ImageFill
              style="h-[64px] w-[54px] flex-shrink-0 rounded-bl-md rounded-tl-md"
              src={getAssetUrl(avatar)}
            />
          )}

          <div class="ml-4 flex flex-col">
            <h2 class="font-clash-semibold text-base leading-5 text-white">{title}</h2>
            <p class="font-clash text-xs text-cosplay-gray-100">{description}</p>
          </div>
        </div>
      </A>
    </div>
  )
}

const ChatRecentChatsNav = (props: any) => {
  const chats = chatStore((s) => ({
    ready: s.allChars.list.length > 0 && (s.active?.char?._id || 'no-id') in s.allChars.map,
    allChars: s.allChars?.list,
    allChats: s.allChats,
    lastChatId: s.lastChatId,
    recentChats: s.allChats.map((chat) => {
      const character = s.allChars?.list?.find((char) => char._id === chat.characterId)

      return {
        ...chat,
        character: { ...character },
      }
    }),
  }))

  createEffect(() => {
    // console.log('recent chats', chats.lastChatId)
    // if (chats.allChats) {
    //   const recentChats = chats.allChats.map((chat) => {
    //     const character = chats.allChars.find((char) => char._id === chat.characterId)
    //     return {
    //       ...chat,
    //       character: { ...character },
    //     }
    //   })
    //   console.log('recentChats', recentChats)
    // }
  })

  return (
    <div class="w-[310px]">
      <h2 class="font-clash-semibold text-[18px] text-cosplay-gray-100">Recent Chats</h2>
      <h3 class="font-clash text-[11px] text-cosplay-gray-100">With your girlfriends</h3>
      <RecentChatsSearch />
      <div class="grid grid-cols-1 gap-4 py-7">
        {chats?.recentChats?.map((chat) => {
          return (
            <RecentChatItem
              title={chat.character?.name}
              description={`${elapsedSince(chat.updatedAt)} ago`}
              avatar={chat.character?.avatar}
              selected={chats.lastChatId === chat._id}
              id={chat._id}
            />
          )
        })}
      </div>
    </div>
  )
}

export default ChatRecentChatsNav
