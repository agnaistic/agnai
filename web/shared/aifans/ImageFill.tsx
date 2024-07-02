import { getAssetUrl } from '../util'

interface Props {
  src: string
  width?: string
  height?: string
  style?: string
}

const ImageFill = ({ src, width, height, style }: Props) => {
  if (!width && !height && !style) {
    console.warn('ImageFill needs width, height, or style props defined to render properly')
  }

  return (
    <div class={`relative overflow-hidden ${style}`}>
      {src && <img class="absolute h-full w-full object-cover" src={getAssetUrl(src)} alt="user" />}
    </div>
  )
}

export default ImageFill
