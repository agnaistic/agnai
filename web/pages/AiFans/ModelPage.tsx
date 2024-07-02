import { Component, createEffect, createSignal, onMount } from 'solid-js'
import { characterStore } from '/web/store'
import { AppSchema } from '/common/types'
import { useParams } from '@solidjs/router'
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

const ModelPage: Component = () => {
  const params = useParams()

  const [character, setCharacter] = createSignal<AppSchema.Character | undefined>(undefined)
  const [avatarUrl, setAvatarUrl] = createSignal<string | undefined>(undefined)

  const chars = characterStore((s) => ({
    list: s.characters.list,
    map: s.characters.list.reduce<Record<string, AppSchema.Character>>(
      (prev, curr) => Object.assign(prev, { [curr._id]: curr }),
      {}
    ),
    loaded: s.characters.loaded,
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
                        <LiveChatButton />
                      </div>
                      <div>
                        <GradientButton
                          title="LIKES &nbsp; 3,576"
                          colorStart="#E12F8F"
                          colorEnd="#E12F42"
                          image={heartIcon}
                        />
                      </div>
                      <div>
                        <GenerateButton />
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
export default ModelPage
