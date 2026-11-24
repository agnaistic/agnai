import { Component, createEffect, createMemo, createSignal, For, onCleanup, Show } from 'solid-js'
import { ChatContext } from '/web/store/context'
import { AppSchema } from '/common/types'
import { imageStore, msgStore, pageStore, toastStore } from '/web/store'
import CircleX from 'lucide-solid/icons/circle-x'
import Modal from '/web/shared/Modal'
import Button from '/web/shared/Button'
import { round } from '/common/util'

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
            <div class="relative inline-block">
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
              <button
                class="icon-button absolute right-[-4px] top-[-4px] rounded-lg  bg-[#000]"
                onClick={() => msgStore.removeAttachment(props.msg._id, index())}
              >
                <CircleX size={16} />
              </button>
            </div>
          )}
        </For>
        {/*<Show when={attachments().length > 0}>
          <div
            class="icon-button flex items-center"
            onClick={() => msgStore.removeAttachment(props.msg._id, -1)}
          >
            <Tooltip tip="Remove all" position="top">
              <CircleX size={20} />
            </Tooltip>
          </div>
        </Show>*/}
      </div>
    </>
  )
}

export const CaptureModal = () => {
  const page = pageStore()

  const [countdown, setCountdown] = createSignal(0)
  const [time, setTime] = createSignal(0)

  let videoRef: HTMLVideoElement | undefined
  let canvasRef: HTMLCanvasElement | undefined
  let interval: NodeJS.Timeout

  const dims = { w: 1280, h: 720 }

  // const canCapture = createMemo(() => {
  //   if (!page.capture?.show) return false
  //   if (!window.navigator.mediaDevices.getUserMedia) return false
  // })

  const captureTimer = (secs = 5) => {
    setCountdown(Date.now() + secs * 1000)
    if (interval) clearInterval(interval)

    interval = setInterval(() => {
      if (countdown() < Date.now()) {
        clearInterval(interval)
        capture()
        return
      }

      const left = (Date.now() - countdown()) / 1000
      setTime(round(left, 1))
    }, 1000 / 60)
  }

  onCleanup(() => {
    if (!interval) return
    clearInterval(interval)
  })

  const capture = () => {
    setCountdown(0)
    setTime(0)
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
      footer={
        <>
          <Button onClick={() => captureTimer()} disabled={countdown() > 0}>
            <Show when={countdown() > 0} fallback={'Capture in 5'}>
              Capturing in {time().toFixed(1)}...
            </Show>
          </Button>
          <Button onClick={capture}>Capture</Button>
        </>
      }
    >
      <video ref={videoRef} class="max-w max-h" autoplay></video>
      <canvas ref={canvasRef} class="hidden"></canvas>
    </Modal>
  )
}

export async function captureImage(callback: (image: string) => void) {}
