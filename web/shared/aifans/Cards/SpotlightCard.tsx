import { A } from '@solidjs/router'
import flame from '/web/asset/aifans/svg/rose.svg'
import { getAssetUrl } from '../../util'

interface Props {
  id?: string
  image?: string
  name?: string
  realName?: string
}

const SpotlightCard = (props: Props) => {
  const card = (
    <div class="group mt-3">
      {props.image && (
        <div class="relative h-[514px] overflow-hidden rounded-lg">
          <img class="absolute h-full w-full object-cover" src={getAssetUrl(props.image)} />
        </div>
      )}
      <div
        class="group-hover:backdrop-blur-2 bottom-0 w-full rounded-b-lg bg-black/40 bg-gradient-to-r from-[#131725] to-[#1e1124] p-2 group-hover:bg-gradient-to-r group-hover:from-purple-600  group-hover:to-blue-600
                                "
      >
        <div class="flex items-center justify-between p-2">
          <span class="font-clash-semibold text-[24px] leading-[40px] text-white">
            {props.name || 'Yae Miko'}
          </span>
          <img
            class="h-12 w-12 group-hover:hidden"
            src="/images/creator-spotlight-flame.png"
            alt=""
          />

          <img
            class="hidden h-12 w-12 group-hover:block"
            src="/images/creator-spotlight-flame-hover.png"
            alt=""
          />
        </div>

        <p class="p-2 font-clash text-sm leading-[24px] text-white">
          Dressing up as a Genshin Impact character is so awsome to me. Come check out my private
          pics and if I’m online come say hello:)
        </p>
        <div class="flex items-center justify-between p-2">
          <span class="font-clash text-[14px] leading-normal text-[#10E0F9]">
            {props.realName || 'Clara Lu'}
          </span>
          <span class="font-clash text-[14px] leading-normal text-[#10E0F9]">12K VIEWS</span>
          <span class="font-clash text-[14px] leading-normal text-[#10E0F9]">5K LIKES</span>
        </div>
      </div>
    </div>
  )

  if (props.id) {
    return <A href={`/model/${props.id}`}>{card}</A>
  }

  return card
}

export default SpotlightCard
