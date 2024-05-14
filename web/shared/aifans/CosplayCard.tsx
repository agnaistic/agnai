import { A, useNavigate } from '@solidjs/router'
import { getAssetUrl } from '../util'

export default function CosplayCard(props: any) {
  const navigate = useNavigate()
  const card = (
    <div class="group relative cursor-pointer overflow-hidden rounded-3xl shadow-lg">
      <img
        class="h-[516px] max-h-[516px] w-full"
        src={getAssetUrl(props.img)}
        alt="cosplay image"
      />
      <div class="description absolute bottom-0 flex w-full items-center justify-between bg-black/[.5] px-4 py-2 backdrop-blur-sm group-hover:bg-gradient-to-r group-hover:from-[#B14DFF] group-hover:to-[#4A72FF]">
        <div class="flex items-center gap-4">
          <div class="h-12 w-12 overflow-hidden rounded-full border border-[#10E0F9]">
            <img src={getAssetUrl(props.img)} alt={props.name} />
          </div>
          <div class="">
            <span class="font-['ClashDisplay-Medium'] text-xl text-white">{props.name}</span>
            <div class="text-md flex items-center gap-2 text-[#10E0F9]">
              <span>{props.age}</span>
              <span>{props.country}</span>
              <img class="h-2.5 w-4" src={props.flag} alt="flag" />
            </div>
          </div>
        </div>
        <div class="rounded-full bg-white/[.2] px-4 py-1 font-['ClashDisplay-Medium'] text-[#10E0F9]">
          {props.author}
        </div>
      </div>
    </div>
  )

  if (props.id) {
    return <button onClick={() => navigate(`/model/${props.id}`, { scroll: true })}>{card}</button>
  }

  return card
}
