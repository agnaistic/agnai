import SampleCardImage from '/web/asset/aifans/model-card-sample-img.png'
import chatIcon from '/web/asset/aifans/model-photo-card-chat-icon.png'
import heartIcon from '/web/asset/aifans/model-photo-card-heart-icon.png'
import starIcon from '/web/asset/aifans/model-photo-card-star-icon.png'
import statsIcon from '/web/asset/aifans/model-photo-card-stats-icon.png'
import tipsIcon from '/web/asset/aifans/model-photo-card-tips-icon.png'

interface Props {
  locked?: boolean
}

const ModelPhotoCard = (props: Props) => {
  return (
    <div class="mb-7 rounded-3xl bg-gradient-to-r from-cosplay-blue-200/10 to-cosplay-pink-100/10 px-4 pb-5 pt-7 font-display last:mb-0 md:last:mb-7">
      <div class={`rounded-lg ${props.locked ? 'blur-lg' : ''}`}>
        <img src={SampleCardImage} class="w-full" />
      </div>
      <div class={`mt-6 flex justify-between ${props.locked ? 'blur-md' : ''}`}>
        <button class="flex items-center">
          <img src={heartIcon} class="w-7" />
          <span class="mb-1 ml-2 text-xxs">2k</span>
        </button>
        <button class="flex items-center">
          <img src={chatIcon} class="w-7" />
          <span class="mb-1 ml-2 text-xxs">3</span>
        </button>
        <button class="flex items-center">
          <img src={starIcon} class="w-7" />
        </button>
        <button class="flex items-center">
          <img src={statsIcon} class="w-7" />
          <span class="mb-1 ml-2 text-xxs">10k</span>
        </button>
        <button class="flex items-center">
          <span class="mr-2 text-sm text-cosplay-pink-200">SEND TIP</span>
          <img src={tipsIcon} class="w-7" />
        </button>
      </div>
    </div>
  )
}

export default ModelPhotoCard
