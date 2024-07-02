interface Props {
  title?: string
  value?: string
  image?: string
}

const ModelAttribute = (props: Props) => {
  return (
    <div class="flex">
      {props.image && (
        <div class="mr-2 mt-2">
          <img src={props.image} class="w-6" />
        </div>
      )}
      <div class="flex flex-col font-clash">
        <span class="text-sm text-cosplay-gray-100">
          {props.title?.toUpperCase() || 'PERSONALITY'}
        </span>
        <span class="text-base leading-5">{props.value || 'Outgoing, seductive'}</span>
      </div>
    </div>
  )
}

export default ModelAttribute
