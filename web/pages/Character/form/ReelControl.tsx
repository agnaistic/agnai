import { ArrowLeft, Trash, ArrowRight, ImagePlus, Settings } from 'lucide-solid'
import { Component } from 'solid-js'
import { v4 } from 'uuid'
import { CharEditor } from '../editor'
import Button from '/web/shared/Button'
import { imageStore } from '/web/store'

export const ReelControl: Component<{ editor: CharEditor; loading: boolean }> = (props) => {
  const createAvatar = async () => {
    imageStore.openImageGen({
      prompt: props.editor.state.appearance || '',
      handler: {
        text: 'Send to Editor',
        schema: 'primary',

        onClick: async (image) => {
          if (!image) return
          props.editor.update('appearance', image?.prompt)

          if (image.reel.state.image) {
            await props.editor.imageCache.addImage(image.reel.state.image, { id: `${v4()}.png` })
          }
          imageStore.closeImageGen()
        },
      },
    })
  }

  const size = 14

  return (
    <div class="flex flex-col items-center gap-1">
      <div class="flex w-fit gap-2">
        <Button size="sm" onClick={createAvatar} disabled={props.loading}>
          <ImagePlus size={16} />
        </Button>
        <Button
          size="sm"
          disabled={props.editor.imageCache.state.images.length <= 1 || props.loading}
          onClick={props.editor.imageCache.prev}
        >
          <ArrowLeft size={size} />
        </Button>

        <Button
          size="sm"
          disabled={props.editor.imageCache.state.imageId === '' || props.loading}
          onClick={() => props.editor.imageCache.removeImage(props.editor.imageCache.state.imageId)}
        >
          <Trash size={size} />
        </Button>

        <Button
          size="sm"
          disabled={props.editor.imageCache.state.images.length <= 1 || props.loading}
          onClick={props.editor.imageCache.next}
        >
          <ArrowRight size={size} />
        </Button>
        <Button size="sm" onClick={() => imageStore.imageSettings(true)}>
          <Settings size={16} />
        </Button>
      </div>

      {/* <div class="flex w-fit gap-2"></div> */}
    </div>
  )
}
