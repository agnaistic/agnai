import on_off_icon from '../assets/img/on-off-icon.png'

export default function CreatorCard(props: any) {
  return (
    <div class="relative cursor-pointer overflow-hidden rounded-3xl bg-gradient-to-br from-[rgba(74,114,255,0.08)] to-[rgba(255,35,255,0.08)] shadow-lg">
      <img class="w-full" src={props.img} alt="cosplay image" />
      <div class="description w-full px-6 py-4">
        <div class="mb-4 flex items-center justify-between">
          <span class="font-['ClashDisplay-Semibold'] text-2xl text-white">{props.name}</span>
          <div class="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-b from-[rgba(16,224,249,0.24)] to-[rgba(74,114,255,0.24)]">
            <img class="h-5 w-5" src={on_off_icon} alt="status" />
          </div>
        </div>
        <p class="mb-4 font-['ClashDisplay-Medium'] text-sm text-white">{props.description}</p>
        <div class="relative">
          <div class="text-md flex items-center justify-between text-[#10E0F9]">
            <span>{props.name}</span>
            <span class="text-[#3D3D3D]">|</span>
            <span>{props.views} VIEWS</span>
            <span class="text-[#3D3D3D]">|</span>
            <span>{props.likes} LIKES</span>
          </div>
        </div>
      </div>
    </div>
  )
}
