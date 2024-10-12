import { Component, createEffect, createSignal } from 'solid-js'
import { FullSprite } from '/common/types/sprite'
import { getRandomBody } from '/web/asset/sprite'
import { RootModal } from '/web/shared/Modal'
import Button from '/web/shared/Button'
import PageHeader from '/web/shared/PageHeader'
import AvatarBuilder from '/web/shared/Avatar/Builder'

export const SpriteModal: Component<{
  body?: FullSprite
  onChange: (body: FullSprite) => void
  show: boolean
  close: () => void
}> = (props) => {
  let ref: any

  const [original, setOriginal] = createSignal(props.body)
  const [body, setBody] = createSignal(props.body || getRandomBody())

  createEffect(() => {
    if (props.body && !original()) {
      setOriginal(props.body)
    }
  })

  const handleChange = () => {
    props.onChange(body())
  }

  return (
    <RootModal
      show={props.show}
      close={props.close}
      fixedHeight
      maxWidth="half"
      footer={
        <>
          <Button onClick={() => props.onChange(original()!)} schema="secondary">
            Cancel
          </Button>
          <Button onClick={handleChange}>Confirm</Button>
        </>
      }
    >
      <PageHeader title="Character Designer" />
      <div class="h-[28rem] w-full text-sm sm:h-[42rem]" ref={ref}>
        <AvatarBuilder body={body()} onChange={(body) => setBody(body)} bounds={ref} noHeader />
      </div>
    </RootModal>
  )
}
