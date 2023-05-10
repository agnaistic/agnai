import { Component, Show, createSignal } from 'solid-js'
import Button from '/web/shared/Button'
import { NewCharacter } from '/web/store'
import { jsonToCharacter } from '../Character/ImportCharacter'
import ChubImportCharModal from './ChubImportChar'
import { CHUB_URL } from '/web/store/chub'
import ChubImportBookModal from './ChubImportBook'
import { extractCardData } from '../Character/card-utils'

export const ChubItem: Component<{
  name: string
  fullPath: string
  avatar: string
  book?: boolean
}> = (props) => {
  const [importChar, setImportChar] = createSignal<NewCharacter>()
  const [showCharModal, setShowCharModal] = createSignal<boolean>(false)
  const [showBookModal, setShowBookModal] = createSignal<boolean>(false)

  const [memorybook, setMemoryBook] = createSignal<any>({})

  const processImage = async (file: File) => {
    const json = await extractCardData(file)
    if (!json) {
      throw new Error('Invalid tavern image')
    }
    setImportChar(Object.assign(jsonToCharacter(json), { avatar: file }))
    setShowCharModal(true)
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

    if (props.book) {
      body.format = 'AGNAI'
      const res = await fetch(`${CHUB_URL}/lorebooks/download`, {
        headers: headers,
        body: JSON.stringify(body),
        method: 'post',
      })

      const json = await res.json()
      setMemoryBook(json)
    } else {
      const res = await fetch(`${CHUB_URL}/characters/download`, {
        headers: headers,
        body: JSON.stringify(body),
        method: 'post',
      })

      const blob = await res.blob()

      processImage(new File([blob], `main_${props.fullPath}.png`, { type: 'image/png' }))
    }
  }

  return (
    <>
      <div class="flex flex-col items-center justify-between gap-1 rounded-md bg-[var(--bg-800)] p-1">
        <div class="w-full">
          <Button
            schema="clear"
            class="block h-32 w-full justify-center overflow-hidden rounded-lg"
            onClick={() => {
              processItem()
              props.book ? setShowBookModal(true) : setShowCharModal(true)
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
      <Show when={showCharModal()}>
        <ChubImportCharModal
          show={showCharModal()}
          close={() => setShowCharModal(false)}
          char={importChar()!}
          fullPath={props.fullPath}
        />
      </Show>
      <Show when={showBookModal()}>
        <ChubImportBookModal
          show={showBookModal()}
          close={() => setShowBookModal(false)}
          fullPath={props.fullPath}
          book={{
            kind: 'memory',
            _id: '',
            name: memorybook().name == 'Exported' ? props.name : memorybook().name,
            description: memorybook().description,
            userId: '',
            entries: memorybook().entries,
          }}
        />
      </Show>
    </>
  )
}
