import { Component, For, createSignal } from 'solid-js'
import { NewCharacter } from '/web/store'
import { extractCardData } from '../Character/card-utils'
import { processBook, processChar } from './util'
import { AppSchema } from '/common/types'
import { jsonToCharacter } from '../Character/port'
import { ChubEntity } from '/web/store/chub'
import { Pill } from '/web/shared/Card'
import { Download, Star } from 'lucide-solid'

export const ChubItem: Component<{
  entity: ChubEntity
  name: string
  fullPath: string
  avatar: string
  loading?: () => void
  book?: boolean
  description: string
  setBook?: (book: AppSchema.MemoryBook, fullPath: string) => void
  setChar?: (char: NewCharacter, fullPath: string) => void
}> = (props) => {
  const [memorybook, setMemoryBook] = createSignal<any>({})

  const loadEntity = async () => {
    props.loading?.()
    if (props.book) {
      const book = await processBook(props.fullPath)
      setMemoryBook(book)
      props.setBook?.(
        {
          _id: '',
          kind: 'memory',
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
      <div class="bg-800 flex flex-col items-center justify-between gap-1 rounded-lg border-[1px] border-[var(--bg-600)]">
        <div class="w-full">
          <div
            class="relative block h-32 w-full cursor-pointer justify-center overflow-hidden rounded-lg rounded-b-none"
            onClick={loadEntity}
          >
            <div class="absolute left-0 top-0 mt-[2px] flex gap-1 px-[2px]">
              <TinyPill>
                <Star size={10} />
                {props.entity?.rating}
              </TinyPill>
              <TinyPill>
                <Download size={10} /> {props.entity?.starCount}
              </TinyPill>
            </div>
            <img
              src={props.avatar}
              class="h-full w-full object-cover"
              style="object-position: 50% 30%;"
            />
          </div>
        </div>
        <div class="w-full text-sm">
          <div class="w-full overflow-hidden text-ellipsis whitespace-nowrap px-1 text-sm font-bold">
            {props.name}
          </div>
          <div class="text-600 line-clamp-3 h-[3rem] text-ellipsis px-1 text-center text-xs font-normal">
            {props.description}
          </div>
          <div class="flex h-10 flex-wrap justify-center gap-1 overflow-hidden px-1">
            <For each={props.entity?.topics || []}>
              {(tag) => (
                <Pill inverse small type="hl" class="h-[16px] max-w-[80px] text-[10px]">
                  <span class="ellipsis">{tag}</span>
                </Pill>
              )}
            </For>
          </div>
        </div>
      </div>
    </>
  )
}

const TinyPill: Component<{ children: any }> = (props) => (
  <Pill small inverse class="px-1 text-[10px]" type="bg" opacity={0.4}>
    {props.children}
  </Pill>
)
