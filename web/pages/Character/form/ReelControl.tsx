import { ArrowLeft, Trash, ArrowRight, ImagePlus, Settings } from 'lucide-solid'
import { Component, createEffect, createMemo, on, onMount, Show } from 'solid-js'
import { v4 } from 'uuid'
import { CharEditor } from '../editor'
import Button from '/web/shared/Button'
import { settingStore, UserState, userStore } from '/web/store'
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
      <ModelOverride
        state={props.editor.state.imageOverride}
        setter={(override) => props.editor.update('imageOverride', override)}
      />
      <div class="flex w-fit gap-2">
        {/* <Button size="sm" >
          <RotateCcw size={size} />
        </Button> */}
        <Button size="sm" onClick={createAvatar} disabled={props.loading}>
          <ImagePlus size={16} /> Generate
        </Button>
        <Button size="sm" onClick={() => settingStore.imageSettings(true)}>
          <Settings size={20} />
        </Button>
      </div>
    </div>
  )
}

const ModelOverride: Component<{ state: string; setter: (override: string) => void }> = (props) => {
  const state = settingStore((s) => ({ models: s.config.serverConfig?.imagesModels || [] }))
  const user = userStore()

  const options = createMemo(() => {
    const list = state.models.map((m) => ({ label: m.desc, value: m.id || m.name }))
    return list
  })

  onMount(() => {
    if (state.models.length) return
    settingStore.getServerConfig()
  })

  createEffect(
    on(
      () => [{ models: state.models }, user.user?.images?.agnai?.model + props.state],
      () => {
        const id = user.user?.images?.agnai?.model
        if (props.state || !id || !state.models.length) return
        props.setter(id)
      }
    )
  )

  return (
    <Show when={(user.sub?.tier.imagesAccess || user.user?.admin) && state.models.length > 0}>
      <Select
        parentClass="text-sm"
        value={props.state}
        items={options()}
        onChange={(ev) => props.setter(ev.value)}
      />
    </Show>
  )
}
