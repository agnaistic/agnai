import ChatLeftNavItem from './components/ChatLeftNavItem'
import GenerateButton from '/web/shared/aifans/model/buttons/GenerateButton'

const ChatLeftNav = (props: any) => {
  return (
    <div class="flex h-full flex-col justify-between">
      <div class="flex flex-col gap-5 p-4">
        <GenerateButton title="GENERATE IMAGE" />
        <ChatLeftNavItem icon="/images/nav-home-icon.png" title="Home" href="/" />
        <ChatLeftNavItem icon="/images/nav-chat-icon.png" title="Chat" href="/chat" />
        <ChatLeftNavItem icon="/images/nav-gallery-icon.png" title="Gallery" />
        <ChatLeftNavItem
          icon="/images/nav-character-requests-icon.png"
          title="Character Requests"
        />
      </div>
      <div class="flex flex-col gap-5 border-t border-t-cosplay-gray-100 px-4 py-6 ">
        <ChatLeftNavItem icon="/images/nav-money-icon.png" title="Affiliate" />
        <ChatLeftNavItem icon="/images/nav-contact-icon.png" title="Contact" />
      </div>
    </div>
  )
}
export default ChatLeftNav
