import DiscoverIcon from '/web/asset/aifans/svg/discover.svg'
import ChatIcon from '/web/asset/aifans/svg/chat.svg'
import CreatorIcon from '/web/asset/aifans/svg/creator.svg'
import MenuIcon from '/web/asset/aifans/svg/menu.svg'

const BottomBar = () => {
  return (
    <div class="h-[60px] rounded-t-[20px] bg-[#131313] opacity-[0.87]">
      <div class="container mx-auto px-4 py-4">
        <div class="flex items-center justify-between">
          <span class="flex cursor-pointer flex-col items-center gap-1">
            <img src={DiscoverIcon} alt="discovericon" />
            <p class="text-[12px] font-[300] text-white">Discover</p>
          </span>
          <span class="flex cursor-pointer flex-col items-center gap-1">
            <img src={ChatIcon} alt="chat" />
            <p class="text-[12px] font-[300] text-white">Live Chat</p>
          </span>
          <span class="flex cursor-pointer flex-col items-center gap-1">
            <img src={CreatorIcon} alt="creatoricon" />
            <p class="text-[12px] font-[300] text-white">Creators</p>
          </span>
          <span class="flex cursor-pointer flex-col items-center gap-1">
            <img src={MenuIcon} alt="menu" />
            <p class="text-[12px] font-[300] text-white">Menu</p>
          </span>
        </div>
      </div>
    </div>
  )
}

export default BottomBar
