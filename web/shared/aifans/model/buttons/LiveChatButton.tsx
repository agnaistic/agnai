import liveChatIcon from '/web/asset/aifans/live-chat-button-icon.png'

interface Props {
  href?: string
}

const LiveChatButton = (props: Props) => {
  return (
    <a
      href={`/chat/${props.href}`}
      class={`flex h-12 w-full items-center justify-between rounded-md border border-white bg-gradient-to-r from-[#4A9DFF] to-[#4A72FF] pl-3 pr-[17px] font-clash text-xl  font-bold md:h-9 md:pr-3 md:text-[15px] lg:flex-row-reverse`}
    >
      <span>LIVE CHAT</span>
      <img src={liveChatIcon} class="ml-3 w-[20px] md:ml-0 md:mr-3" />
    </a>
  )
}

export default LiveChatButton
