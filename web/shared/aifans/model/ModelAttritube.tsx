import personalityTraitsIcon from '/web/asset/aifans/traits-icons-personality.png'

interface Props {
  title?: string
  value?: string
  image?: string
}

const ModelAttribute = (props: Props) => {
  return (
    <div class="flex">
      <div class="mr-2 mt-2">
        <img src={props.image || personalityTraitsIcon} class="w-6" />
      </div>
      <div class="flex flex-col font-display">
        <span class="text-sm text-[#949494]">{props.title?.toUpperCase() || 'PERSONALITY'}</span>
        <span class="text-base leading-5">{props.value || 'Outgoing, seductive'}</span>
      </div>
    </div>
  )
}

export default ModelAttribute
