import SubscribeButton from './buttons/SubscribeButton'
import lockIcon from '/web/asset/aifans/subscribe-to-unlock-lock.png'

const SubscribeToUnlock = () => {
  return (
    <div class="relative md:mx-auto ">
      <div class="mx-2.5 my-6 rounded-lg bg-[#0C0F12]/30 px-5 py-5 md:my-12 md:max-w-4xl md:px-36 md:py-8">
        <div class="flex items-center md:justify-center">
          <img src={lockIcon} class="mb-8 w-7 md:mb-3" />
          <div class="ml-4 mr-7 font-displayBold text-[40px] leading-[50px] md:mr-0">
            Subscribe To Unlock
          </div>
        </div>
        <div class="mt-5 text-center font-display text-xl text-[#E6E6E6]">
          <div>
            Enjoy full access to Candice Nice and all her private content and unlimited live chats!{' '}
          </div>
          <div class="mt-4">Subscribe and enjoy</div>
          <SubscribeButton />
        </div>
      </div>
    </div>
  )
}

export default SubscribeToUnlock
