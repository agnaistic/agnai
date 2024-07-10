import { Component, createEffect, createMemo, createSignal, onMount } from 'solid-js'
import { AllChat, characterStore, chatStore, userStore } from '/web/store'
import { AppSchema } from '/common/types'
import { useNavigate, useParams } from '@solidjs/router'
import { getAssetUrl, setComponentPageTitle } from '/web/shared/util'
import { isLoggedIn } from '/web/store/api'

import favoriteIcon from '/web/asset/aifans/model-favorite-star.png'
import clockIcon from '/web/asset/aifans/model-clock-icon.png'
import locationIcon from '/web/asset/aifans/model-location-icon.png'
import heartIcon from '/web/asset/aifans/heart-button-icon.png'
import GradientButton from '/web/shared/aifans/GradientButton'
import ModelTraits from '../../shared/aifans/model/ModelTraits'
import ModelPhotos from '/web/shared/aifans/model/ModelPhotos'
import LiveChatButton from '/web/shared/aifans/model/buttons/LiveChatButton'
import GenerateButton from '/web/shared/aifans/model/buttons/GenerateButton'
import Footer from '/web/shared/aifans/Footer'
import Header from '/web/shared/aifans/Header'
import { ChatCharacter } from '../Character/util'

const ModelPage: Component = () => {
  const params = useParams()
  const nav = useNavigate()

  const [character, setCharacter] = createSignal<AppSchema.Character | undefined>(undefined)
  const [avatarUrl, setAvatarUrl] = createSignal<string | undefined>(undefined)
  const [liveChatId, setLiveChatId] = createSignal<string | undefined>(undefined)

  const chars = characterStore((s) => ({
    list: s.characters.list,
    map: s.characters.list.reduce<Record<string, AppSchema.Character>>(
      (prev, curr) => Object.assign(prev, { [curr._id]: curr }),
      {}
    ),
    loaded: s.characters.loaded,
  }))

  const state = chatStore((s) => ({
    chats: s.allChats.map((chat) => ({
      _id: chat._id,
      name: chat.name,
      createdAt: chat.createdAt,
      updatedAt: chat.updatedAt,
      characterId: chat.characterId,
      characters: toChatListState(s.allChars.map, chat),
      messageCount: chat.messageCount,
    })),
    chars: s.allChars.map,
  }))

  onMount(() => {
    if (!chars.loaded) {
      characterStore.getCharacters()
    }

    // chatStore.getAllChats()
  })

  createEffect(() => {
    if (!params.id) {
      setComponentPageTitle(`Chats`)
      return
    }

    const char = chars.list.find((c) => c._id === params.id)
    setCharacter(char)

    const avatar = character()?.avatar
    if (avatar) {
      setAvatarUrl(getAssetUrl(avatar))
    }
  })

  const chats = createMemo(() => {
    const filterCharId = params.id

    return state.chats.filter((chat) => {
      if (filterCharId && !chat.characters.some((c) => c._id === filterCharId)) return false

      return true
    })
  })

  createEffect(() => {
    console.log('chats', chats())

    const latestChat = chats().sort(function (a, b) {
      // Turn your strings into dates, and then subtract them
      // to get a value that is either negative, positive, or zero.
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    })

    if (latestChat && latestChat[0]) {
      setLiveChatId(latestChat[0]._id)
      console.log('liveChatId()', liveChatId())
    }
  })

  const onClickToChat = () => {
    const lastChatId = liveChatId()
    if (isLoggedIn()) {
      const href = lastChatId ? `/chat/${lastChatId}` : '/chat/'
      nav(href)
    } else {
      userStore.loginModal(true)
    }
  }

  const defaultDescription = `Hi I’m Candice Nice, a vibrant influencer who loves to please my followers with a
                cheerful and playful personality. I just love to dress as Harley Quinn and bring her
                to life through cosplay. From intimate moments to exotic adventures, my passion for
                cosplay has no boundaries.`

  return (
    <div class="h-full w-full bg-black">
      <div class="h-full w-full bg-model-backdrop">
        <div class="relative w-full">
          <div class="absolute left-3 right-3 top-3 z-50 md:relative md:left-auto md:right-auto md:top-auto md:bg-white/5 ">
            <div class="xl:container md:mx-auto md:px-5 lg:px-[20px] xl:px-[40px] 2xl:max-w-[1775px] 2xl:px-[60px]  ">
              <Header />
            </div>
          </div>
          <div class="w-full xl:container md:mx-auto md:px-5 md:py-[27px] lg:px-[20px] xl:px-[40px] 2xl:max-w-[1775px] 2xl:px-[60px]">
            <div class="md:flex">
              <div class="relative h-[445px] w-full overflow-hidden md:shrink-0 md:grow-0 md:basis-[387px] md:rounded-[12px]">
                <img class="absolute h-full w-full object-cover" src={avatarUrl()} />
              </div>
              <div class="md:ml-6">
                <div class="mx-[22px] my-[14px] flex">
                  <h1 class="font-clash text-[40px] leading-[40px] text-white">
                    {character()?.name}
                  </h1>
                  <img src={favoriteIcon} class="ml-2 h-[20px] w-[20px]" />
                </div>
                <div class="flex">
                  <div class="ml-[22px] flex items-center">
                    <img src={clockIcon} class="h-[44px] w-[44px]" />
                    <span class="ml-2 font-clash text-[16px]">30 MIN AGO</span>
                  </div>
                  <div class="ml-7 flex items-center">
                    <img src={locationIcon} class="h-[44px] w-[44px]" />
                    <span class="ml-2 font-clash text-[16px]">United States</span>
                  </div>
                </div>
                <div class="mx-[22px] mb-[30px] mt-[18px]">
                  <div class="md:flex md:flex-col-reverse">
                    <p class="break-all font-clash text-[18px] 2xl:max-w-2xl">
                      {character()?.description || defaultDescription}
                    </p>
                    <div class="mt-[30px] flex flex-col gap-3 md:mb-4 md:mt-0 lg:flex-row lg:gap-5">
                      <div>
                        <LiveChatButton onClick={onClickToChat} />
                      </div>
                      <div>
                        <GradientButton
                          title="LIKES &nbsp; 3,576"
                          colorStart="#E12F8F"
                          colorEnd="#E12F42"
                          image={heartIcon}
                          onClick={onClickToChat}
                        />
                      </div>
                      <div>
                        <GenerateButton onClick={onClickToChat} />
                      </div>
                    </div>
                  </div>
                  <ModelTraits />
                </div>
              </div>
            </div>
            <div class="mx-2 my-16 md:my-0">
              <ModelPhotos locked={!isLoggedIn()} />
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  )
}

function toCharacterIds(characters?: Record<string, boolean>) {
  if (!characters) return []

  const ids: string[] = []
  for (const [id, enabled] of Object.entries(characters)) {
    if (enabled) ids.push(id)
  }
  return ids
}

function toChatListState(chars: Record<string, AppSchema.Character>, chat: AllChat) {
  const charIds = [chat.characterId].concat(toCharacterIds(chat.characters))

  const seen = new Set<string>()
  const rows: ChatCharacter[] = []
  for (const id of charIds) {
    if (seen.has(id)) continue
    seen.add(id)
    const char = chars[id]
    if (!char) {
      rows.push({ _id: '', name: 'Unknown', description: '', avatar: '' })
      continue
    }

    rows.push({
      _id: char._id,
      name: char.name,
      description: char.description || '',
      avatar: char.avatar,
    })
  }

  return rows
}

export default ModelPage
