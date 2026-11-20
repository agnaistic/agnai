import { Component, createMemo, createSignal } from 'solid-js'
import { createStore } from 'solid-js/store'
import { ImageContext } from './image-context'
import { ImagePresetSettings, ImageProviderSettings } from 'common/types/image-schema'
import { userStore } from 'web/store'
import { CustomOption, CustomSelect } from 'web/shared/CustomSelect'
import Modal, { ConfirmModal } from 'web/shared/Modal'
import { getStore } from 'web/store/create'
import { TrashIcon } from 'lucide-solid'
import TextInput from 'web/shared/TextInput'
import { SelectImageProvider } from './ImageProvider'
import Button from 'web/shared/Button'

type ImagePreset = {
  _id: string
  providerId: string

  provider: { [id: string]: ImageProviderSettings }
  samplers: Omit<ImagePresetSettings, '_id' | 'name'>
}

export const ImagePreset: Component<{ ctx: ImageContext; prefix?: string }> = (props) => {
  const state = userStore((u) => ({ presets: u.user?.imagePresets || [] }))
  const [deleting, setDeleting] = createSignal<CustomOption>()

  const options = createMemo(() => {
    const list = state.presets.map((p) => ({
      label: `${p.name || 'Unnamed'}`,
      value: p._id,
    }))
    return [{ label: 'None', value: '' }].concat(list)
  })

  const selected = createMemo(() => {
    return state.presets.find((p) => p._id === props.ctx.current.preset._id)
  })

  const deletePreset = () => {
    const opt = deleting()
    if (!opt) return

    setDeleting()
    getStore('user').deletePreset(opt.value)
  }

  const onSelect = async (opt: CustomOption) => {
    await props.ctx.changeImagePreset(opt.value)
  }

  return (
    <>
      <CustomSelect
        size="sm"
        options={options()}
        selected={props.ctx.current.preset._id}
        onSelect={onSelect}
        buttonLabel={(opt) =>
          `${props.prefix ? props.prefix + ': ' : ''}${selected()?.name || 'Unnamed'}`
        }
        actions={[
          {
            comp: (opt) => (
              <div class="icon-button" onClick={() => setDeleting(opt)}>
                <TrashIcon />
              </div>
            ),
          },
        ]}
      />
      <ConfirmModal
        show={!!deleting()}
        close={() => setDeleting()}
        confirm={deletePreset}
        message={
          <div class="flex items-center">
            <p>Are you sure you wish to delete this preset?</p>
            <b>{deleting()?.label}</b>
            <p></p>
          </div>
        }
      />
    </>
  )
}

export const CreateImagePresetModal: Component<{
  ctx: ImageContext
  show: boolean
  close: () => void
}> = (props) => {
  const [state, setState] = createStore({ name: '', providerId: '', modelId: '' })

  const cancel = () => {
    props.close()
  }

  const create = () => {
    props.ctx.createNewPreset(state)
    props.close()
  }

  return (
    <Modal
      show={props.show}
      close={props.close}
      footer={
        <>
          <Button schema="grey" onClick={cancel}>
            Cancel
          </Button>
          <Button schema="success" onClick={create}>
            Create
          </Button>
        </>
      }
    >
      <div class="flex flex-col gap-4">
        <TextInput
          label="Preset Name"
          placeholder={`Name of this image preset`}
          onChange={(ev) => setState('name', ev.currentTarget.value)}
          value={state.name}
        />

        <div class="flex flex-col">
          <div>Image Provider</div>
          <SelectImageProvider
            ctx={props.ctx}
            onSelect={(opt) => setState({ providerId: opt.value })}
          />
        </div>
      </div>
    </Modal>
  )
}
