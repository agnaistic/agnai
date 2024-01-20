import { Import, X } from 'lucide-solid'
import { Component, For, Show, createSignal, onMount } from 'solid-js'
import FileInput, { FileInputResult } from '../../shared/FileInput'
import Modal from '../../shared/Modal'
import { characterStore, NewCharacter, toastStore } from '../../store'
import AvatarIcon from '/web/shared/AvatarIcon'
import { SUPPORTED_FORMATS, downloadCharacterHub, importCharacterFile } from './port'
import Button from '/web/shared/Button'
import { useTransContext } from '@mbarzda/solid-i18next'

const MAX_SHOWN_IMPORTS = 3

const ImportCharacterModal: Component<{
  show: boolean
  close: () => void
  onSave: (chars: NewCharacter[], images: Array<File | undefined>) => void
  charhubPath?: string
  single?: boolean
}> = (props) => {
  const [t] = useTransContext()

  const state = characterStore()
  const [imported, setImported] = createSignal<NewCharacter[]>([])
  const [images, setImages] = createSignal<Array<File | undefined>>([])
  const [failed, setFailed] = createSignal<string[]>([])
  const [ready, setReady] = createSignal(false)

  onMount(async () => {
    if (!props.charhubPath) return
    try {
      const { json } = await downloadCharacterHub(t, props.charhubPath)
      setImported([json])
      toastStore.success(t('successfully_downloaded_from_character_hub'))
      setReady(true)
    } catch (ex: any) {
      toastStore.error(t('character_hub_download_failed_with_message_x', { message: ex.message }))
    }
  })

  const processFiles = async (files: FileInputResult[]) => {
    reset()

    const results = await Promise.allSettled(files.map((file) => importCharacterFile(t, file)))
    for (let i = 0; i < results.length; i++) {
      const result = results[i]
      if (result.status === 'rejected') {
        setFailed(failed().concat(files[i].file.name))
      } else {
        setImported(imported().concat(result.value.char))
        setImages(images().concat(result.value.image))
      }
    }

    setReady(imported().length > 0)
  }

  const onImport = async () => {
    if (!ready()) return
    props.onSave(imported(), images())
  }

  const reset = () => {
    setReady(false)
    setImages([])
    setImported([])
    setFailed([])
  }

  const cancel = () => {
    reset()
    props.close()
  }

  return (
    <Modal
      show={props.show}
      title={t('import_character')}
      close={cancel}
      footer={
        <>
          <Button schema="secondary" onClick={cancel}>
            <X />
            {t('cancel')}
          </Button>

          <Button onClick={onImport} disabled={state.creating || !ready()}>
            <Import />
            {t('import')}
          </Button>
        </>
      }
    >
      <div class="flex flex-col gap-2">
        <FileInput
          label={t('avatar_or_json_file')}
          fieldName="file"
          accept="text/json,application/json,image/png,image/jpeg,image/webp"
          helperText={t('supported_formats_x', { format: SUPPORTED_FORMATS(t) })}
          required
          multiple={!props.single}
          onUpdate={processFiles}
        />
      </div>

      <Show when={imported().length}>
        <div class="mt-2 text-lg">{t('character_to_import')}</div>
        <div class="markdown">
          <ul>
            <For each={imported().slice(0, MAX_SHOWN_IMPORTS)}>
              {(i) => (
                <li class="flex gap-2">
                  <AvatarIcon format={{ corners: 'circle', size: 'sm' }} avatarUrl={i.avatar} />
                  {i.name ?? 'Unnamed'}
                </li>
              )}
            </For>
            <Show when={imported().length === MAX_SHOWN_IMPORTS + 1}>
              <li>{t('and_one_other')}</li>
            </Show>
            <Show when={imported().length > MAX_SHOWN_IMPORTS + 1}>
              <li>{t('and_x_others', { count: imported().length - MAX_SHOWN_IMPORTS })}</li>
            </Show>
          </ul>
        </div>
      </Show>

      <Show when={failed().length}>
        <div class="mt-2 text-lg">{t('failed_character_imports')}</div>
        <div class="markdown">
          <ul>
            <For each={failed().slice(0, MAX_SHOWN_IMPORTS)}>
              {(i) => <li>{i ?? 'Unnamed'}</li>}
            </For>
            <Show when={failed().length === MAX_SHOWN_IMPORTS + 1}>
              <li>{t('and_one_other')}</li>
            </Show>
            <Show when={failed().length > MAX_SHOWN_IMPORTS + 1}>
              <li>{t('and_x_others', { count: failed().length - MAX_SHOWN_IMPORTS })}</li>
            </Show>
          </ul>
        </div>
      </Show>
    </Modal>
  )
}

export default ImportCharacterModal
