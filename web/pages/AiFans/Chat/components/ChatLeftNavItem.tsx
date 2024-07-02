const ChatLeftNavItem = (props: any) => {
  return (
    <div class="flex items-center">
      <img src={props.icon} class="h-6 w-6" />
      <span class="ml-3 font-clash text-base text-white/80">{props.title}</span>
    </div>
  )
}

export default ChatLeftNavItem
