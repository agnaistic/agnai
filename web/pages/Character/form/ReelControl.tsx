import { ArrowLeft, Trash, ArrowRight } from 'lucide-solid'
import { Component, createMemo, createSignal, Show } from 'solid-js'
import { v4 } from 'uuid'
import { CharEditor } from '../editor'
import Button from '/web/shared/Button'
import { settingStore, UserState } from '/web/store'
import Select from '/web/shared/Select'

export const ReelControl: Component<{ editor: CharEditor; loading: boolean; user: UserState }> = (
  props
) => {
  const createAvatar = async () => {
    const base64 = await props.editor.createAvatar()
    if (!base64) return

    await props.editor.imageCache.addImage(base64, `${v4()}.png`)
  }

  const size = 14

  return (
    <div class="flex flex-col items-center gap-1">
      <div class="flex w-fit gap-2">
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
      </div>
      <ModelOverride user={props.user} />
      <div class="flex w-fit gap-2">
        {/* <Button size="sm" >
          <RotateCcw size={size} />
        </Button> */}
        <Button size="sm" onClick={createAvatar} disabled={props.loading}>
          Generate Image
        </Button>
      </div>
    </div>
  )
}

const ModelOverride: Component<{ user: UserState }> = (props) => {
  const state = settingStore((s) => ({ models: s.config.serverConfig?.imagesModels || [] }))
  const options = createMemo(() => {
    const list = state.models.map((m) => ({ label: m.desc, value: m.id || m.name }))
    return list
  })

  const [id, setId] = createSignal(props.user.user?.images?.agnai?.model)

  return (
    <Show
      when={
        (props.user.sub?.tier.imagesAccess || props.user.user?.admin) && state.models.length > 0
      }
    >
      <Select
        parentClass="text-sm"
        fieldName="imageOverride"
        value={id()}
        items={options()}
        onChange={(ev) => setId(ev.value)}
      />
    </Show>
  )
}
