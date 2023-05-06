import { Component, Show, createSignal } from 'solid-js'
import Button from '/web/shared/Button'
import { NewCharacter } from '/web/store'
import { extractTavernData } from '../Character/tavern-utils'
import { jsonToCharacter } from '../Character/ImportCharacter'
import ChubImportModal from './ChubImport'
import { CHUB_URL } from '/web/store/chub'

export const ChubItem: Component<{
  name: string
  fullPath: string
  avatar: string
  book?: boolean
}> = (props) => {
  const [importChar, setImportChar] = createSignal<NewCharacter>()
  const [showModal, setShowModal] = createSignal<boolean>(false)

  const processImage = async (file: File) => {
    const json = await extractTavernData(file)
    if (!json) {
      throw new Error('Invalid tavern image')
    }
    setImportChar(jsonToCharacter(json))
    setShowModal(true)
  }

  const processItem = async () => {
    const headers = {
      'Content-Type': 'application/json',
      accept: '/',
    }

    const body = {
      format: 'tavern',
      fullPath: props.fullPath,
      version: 'main',
    }

    const res = await fetch(`${CHUB_URL}/characters/download`, {
      headers: headers,
      body: JSON.stringify(body),
      method: 'post',
    })

    const blob = await res.blob()

    processImage(new File([blob], `main_${props.fullPath}`))
  }

  return (
    <>
      <div class="flex flex-col items-center justify-between gap-1 rounded-md bg-[var(--bg-800)] p-1">
        <div class="w-full">
          <Button
            schema="clear"
            class="block h-32 w-full justify-center overflow-hidden rounded-lg"
            onClick={() => {
              setShowModal(true)
              processItem()
            }}
          >
            <img
              src={props.avatar}
              class="h-full w-full object-cover"
              style="object-position: 50% 30%;"
            />
          </Button>
        </div>
        <div class="w-full overflow-hidden text-ellipsis whitespace-nowrap px-1 text-sm font-bold">
          {props.name}
        </div>
      </div>
      <Show when={importChar}>
        <ChubImportModal
          show={showModal()}
          close={() => setShowModal(false)}
          char={importChar()!}
        />
      </Show>
    </>
  )
}
