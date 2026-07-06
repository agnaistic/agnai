import { Component, createEffect, createMemo, For, Show } from 'solid-js'
import { ChatContext } from '/web/store/context'
import { AppSchema } from '/common/types'
import { imageStore, msgStore, pageStore, toastStore } from '/web/store'
import { CircleX } from 'lucide-solid'
import Tooltip from '/web/shared/Tooltip'
import Modal from '/web/shared/Modal'
import Button from '/web/shared/Button'

export const MessageAttachments: Component<{ ctx: ChatContext; msg: AppSchema.ChatMessage }> = (
  props
) => {
  const attachments = createMemo(() => {
    const list = props.ctx.attachments[props.msg._id]
    if (!list?.length) return []

    const images: string[] = []

    for (const item of list) {
      if (item.type !== 'image') continue
      images.push(item.image)
    }

    return images
  })

  return (
    <>
      <div class="flex flex-wrap gap-2">
        <For each={attachments()}>
          {(image, index) => (
            <img
              class="max-h-8 cursor-pointer rounded-md sm:max-h-12"
              src={image}
              onClick={() =>
                imageStore.showImage({
                  src: { type: 'url', id: image },
                  actions: [
                    {
                      schema: 'warning',
                      text: 'Remove',
                      onClick: () => {
                        imageStore.clearImage()
                        msgStore.removeAttachment(props.msg._id, index())
                      },
                    },
                  ],
                })
              }
            />
          )}
        </For>
        <Show when={attachments().length > 0}>
          <div
            class="icon-button flex items-center"
            onClick={() => msgStore.removeAttachment(props.msg._id, -1)}
          >
            <Tooltip tip="Remove all" position="top">
              <CircleX size={20} />
            </Tooltip>
          </div>
        </Show>
      </div>
    </>
  )
}

export const CaptureModal = () => {
  const page = pageStore()

  let videoRef: HTMLVideoElement | undefined
  let canvasRef: HTMLCanvasElement | undefined

  const dims = { w: 1280, h: 720 }

  const canCapture = createMemo(() => {
    if (!page.capture?.show) return false
    if (!window.navigator.mediaDevices.getUserMedia) return false
  })

  const capture = () => {
    if (!videoRef || !canvasRef) return
    canvasRef.width = dims.w
    canvasRef.height = dims.h
    canvasRef.getContext('2d')?.drawImage(videoRef, 0, 0, dims.w, dims.h)
    const base64 = canvasRef.toDataURL('image/png')
    const blob = new Blob([base64])
    const file = new File([blob], `capture.png`, { type: 'image/png' })
    page.capture?.callback({ file, image: base64 })
    pageStore.closeCapture()

    const stream = videoRef.srcObject as MediaStream
    if (!stream) return
    if (stream) {
      const tracks = stream.getTracks()
      for (const track of tracks) {
        track.stop()
      }
    }
  }

  createEffect(async () => {
    if (!page.capture?.show) return
    if (!videoRef) return
    if (!canvasRef) return

    try {
      const stream = await window.navigator.mediaDevices.getUserMedia({
        video: {
          width: dims.w,
          height: dims.h,
        },
      })
      videoRef.srcObject = stream
    } catch (ex: any) {
      toastStore.error('Unable to capture image', { stack: ex.stack })
      console.error(ex)
    }
  })

  return (
    <Modal
      show={!!page.capture?.show}
      close={() => pageStore.closeCapture()}
      maxWidth="half"
      footer={<Button onClick={capture}>Capture</Button>}
    >
      <video ref={videoRef} class="max-w max-h" autoplay></video>
      <canvas ref={canvasRef} class="hidden"></canvas>
    </Modal>
  )
}

export async function captureImage(callback: (image: string) => void) {}
