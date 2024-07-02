import { A, useParams } from '@solidjs/router'
import { getAssetUrl } from '/web/shared/util'
import { chatStore } from '/web/store'
import GenerateButton from '/web/shared/aifans/model/buttons/GenerateButton'
import ChatModelTraits from './ChatModelTraits'

const ChatRightNav = (props: any) => {
  const params = useParams()

  const chats = chatStore((s) => ({
    ...(s.active?.chat._id === params.id ? s.active : undefined),
  }))

  return (
    <div class="flex h-[calc(100vh-122px)] flex-col overflow-x-hidden overflow-y-scroll">
      <div class="relative h-[488px] w-[406px] flex-shrink-0 overflow-hidden">
        <img
          class="absolute h-full w-full object-cover"
          src={'/images/image-generator-placeholder-1.jpg'}
          alt="user"
        />
      </div>
      <div class="border-b border-b-cosplay-gray-100 px-8 py-[18px]">
        <div class="flex flex-row items-end">
          <h2 class="mr-3 font-clash-bold text-[30px] leading-[30px]">{chats.char?.name}</h2>
          <div class="flex-shrink-0">
            <A href={`/model/${chats.char?._id}`} class="text-cosplay-red">
              View Full Profile
            </A>
          </div>
        </div>
        <div class="mt-3">
          <span class="text-[15px]">Character - </span>
          <span class="text-[15px] text-cosplay-gray-100">Harley Quinn</span>
        </div>
        <div class="mt-4">
          <GenerateButton title="GENERATE IMAGE" centered />
        </div>
      </div>
      <div class="">
        <ChatModelTraits />
      </div>
    </div>
  )
}
export default ChatRightNav
