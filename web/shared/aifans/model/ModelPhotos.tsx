import LoadMoreButton from './buttons/LoadMoreButton'
import ModelPhotoCard from './ModelPhotoCard'
import SubscribeToUnlock from './SubscribeToUnlock'

interface Props {
  locked?: boolean
  hasMore?: boolean
}

const ModelPhotos = (props: Props) => {
  return (
    <div class="relative md:flex md:flex-col md:items-center">
      {props.locked && (
        <div class="absolute bottom-3 left-2 right-2 top-2 z-10 flex rounded-xl bg-white/20">
          <SubscribeToUnlock />
        </div>
      )}
      <div
        class={`grid gap-x-8 gap-y-6 first:mt-32 last:mb-0 md:grid-cols-2 md:first:mt-24 lg:grid-cols-3 lg:gap-x-4 xl:gap-x-8 2xl:grid-cols-4 ${
          props.locked ? 'blur-md' : ''
        }`}
      >
        <ModelPhotoCard locked={props.locked} />
        <ModelPhotoCard locked={props.locked} />
        <ModelPhotoCard locked={props.locked} />
        <ModelPhotoCard locked={props.locked} />
        <ModelPhotoCard locked={props.locked} />
        <ModelPhotoCard locked={props.locked} />
        <ModelPhotoCard locked={props.locked} />
        <ModelPhotoCard locked={props.locked} />
      </div>
      <div class="mt-6 md:mt-10">{props.hasMore && <LoadMoreButton />}</div>
    </div>
  )
}

export default ModelPhotos
