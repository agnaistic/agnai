import { A } from '@solidjs/router'
import { getAssetUrl } from '/web/shared/util'

interface Props {
  image?: string
  name?: string
  id?: string
}

const ChatHeaderAiFans = (props: Props) => {
  return (
    <div class="flex flex-1 items-center justify-between border-b border-b-[#949494] p-4">
      <div class="flex items-center">
        {props.image && (
          <div class="relative h-12 w-12 overflow-hidden rounded-full border-2 border-white">
            <A href={`/model/${props.id}`}>
              <img
                class="absolute h-full w-full object-cover"
                src={getAssetUrl(props.image)}
                alt="user"
              />
            </A>
          </div>
        )}

        <A href={`/model/${props.id}`}>
          <h1 class="ml-3 font-clash-bold text-2xl">{props.name}</h1>
        </A>
      </div>
      <button>
        <img src="/images/open-panel-button.png" class="w-9" />
      </button>
    </div>
  )
}

export default ChatHeaderAiFans
