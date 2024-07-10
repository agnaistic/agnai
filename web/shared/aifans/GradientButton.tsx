import liveChatIcon from '/web/asset/aifans/live-chat-button-icon.png'

interface Props {
  title?: string
  image?: string
  colorStart?: string
  colorEnd?: string
  onClick?: () => void
}

const GradientButton = (props: Props) => {
  const gradientFrom = props.colorStart ? `from-[${props.colorStart}]` : 'from-[#E12F8F]'
  const gradientTo = props.colorEnd ? `to-[${props.colorEnd}]` : 'to-[#E12F42]'

  return (
    <button
      onClick={props.onClick}
      class={`flex h-12 w-full items-center justify-between rounded-md border border-white bg-gradient-to-r font-bold lg:flex-row-reverse ${gradientFrom} ${gradientTo}  pl-3 pr-[17px] font-clash text-xl  md:h-9 md:pr-3 md:text-[15px] `}
    >
      <span>{props.title}</span>
      <img src={props.image || liveChatIcon} class="ml-3 w-[20px] md:ml-0 md:mr-3" />
    </button>
  )
}

export default GradientButton
