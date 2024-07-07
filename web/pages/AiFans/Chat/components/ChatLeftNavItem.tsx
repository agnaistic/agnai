const ChatLeftNavItem = (props: any) => {
  return (
    <a class="flex items-center" href={props.href}>
      <img src={props.icon} class="h-6 w-6" />
      <span class="ml-3 font-clash text-base text-white/80">{props.title}</span>
    </a>
  )
}

export default ChatLeftNavItem
