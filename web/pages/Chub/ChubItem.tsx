import { Component, createSignal } from 'solid-js'
import Button from '/web/shared/Button'
import { NewCharacter } from '/web/store'
import { jsonToCharacter } from '../Character/ImportCharacter'
import { extractCardData } from '../Character/card-utils'
import { processBook, processChar } from './util'
import { AppSchema } from '/srv/db/schema'

export const ChubItem: Component<{
  name: string
  fullPath: string
  avatar: string
  book?: boolean
  setBook?: (book: AppSchema.MemoryBook, fullPath: string) => void
  setChar?: (char: NewCharacter, fullPath: string) => void
}> = (props) => {
  const [memorybook, setMemoryBook] = createSignal<any>({})

  const processItem = async () => {
    if (props.book) {
      const book = await processBook(props.fullPath)
      setMemoryBook(book)
      props.setBook?.(
        {
          kind: 'memory',
          _id: '',
          name: memorybook().name == 'Exported' ? props.name : memorybook().name,
          description: memorybook().description,
          userId: '',
          entries: memorybook().entries,
        },
        props.fullPath
      )
      return
    }

    const file = await processChar(props.fullPath)
    const json = await extractCardData(file)
    if (!json) {
      throw new Error('Invalid tavern image')
    }
    props.setChar?.(Object.assign(jsonToCharacter(json), { avatar: file }), props.fullPath)
  }

  return (
    <>
      <div class="flex flex-col items-center justify-between gap-1 rounded-md bg-[var(--bg-800)] p-1">
        <div class="w-full">
          <Button
            schema="clear"
            class="block h-32 w-full justify-center overflow-hidden rounded-lg"
            onClick={processItem}
          >
            <img
              src={props.avatar}
              class="h-full w-full rounded-md object-cover"
              style="object-position: 50% 30%;"
            />
          </Button>
        </div>
        <div class="w-full overflow-hidden text-ellipsis whitespace-nowrap px-1 text-sm font-bold">
          {props.name}
        </div>
      </div>
    </>
  )
}
