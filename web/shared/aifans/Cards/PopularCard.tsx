import { A, useNavigate } from '@solidjs/router'
import { getAssetUrl } from '../../util'
import flag from '/static/images/flag.png'

interface Props {
  id?: string
  image?: string
  name?: string
  realName?: string
}

const PopularCard = (props: Props) => {
  const card = (
    <>
      {props.image && (
        <div class="relative h-[514px] overflow-hidden rounded-lg">
          <img
            class="absolute h-full w-full object-cover"
            src={getAssetUrl(props.image)}
            alt="user"
          />
        </div>
      )}
      <div
        class={`group-hover:backdrop-blur-2 absolute bottom-0 w-full rounded-b-lg bg-black/70 from-purple-600 to-blue-600 backdrop-blur-sm group-hover:bg-gradient-to-r`}
      >
        <div class="flex items-center justify-between p-2">
          <div class="flex items-center gap-3">
            {props.image && (
              <div class="relative h-[47px] w-[47px] flex-shrink-0 overflow-hidden rounded-full border-2 border-[#10E0F9]">
                <img
                  class="absolute h-full w-full object-cover"
                  src={getAssetUrl(props.image)}
                  alt="user"
                />
              </div>
            )}
            <div>
              <h3 class="font-clash-semibold text-[18px] text-white">{props.name || 'Jane Doe'}</h3>
              <div class="flex items-center gap-1">
                <span class="font-clash-semibold text-xs uppercase leading-normal text-cyan-400">
                  23
                </span>
                <span class="font-clash-semibold text-xs uppercase leading-normal text-cyan-400">
                  USA
                </span>
                <img class="h-[9px] w-[14px]" src={flag} alt="flag" />
              </div>
            </div>
          </div>
          <div class="rounded-2xl bg-cyan-400/30 px-3 py-1 text-center font-clash-semibold text-sm text-cyan-400">
            {props.realName || 'Jane Doe'}
          </div>
        </div>
      </div>
    </>
  )

  if (props.id) {
    return (
      <div class="group relative mt-3">
        <A href={`/model/${props.id}`}>{card}</A>
      </div>
    )
  }

  return <div class="group relative mt-3">{card}</div>
}

export default PopularCard
