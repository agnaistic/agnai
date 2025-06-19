import { Component, For, Show, createMemo, createSignal, onMount } from 'solid-js'
import { chubStore, createOnEnter } from '../../store/chub'
import TextInput from '../../shared/TextInput'
import Button from '../../shared/Button'
import { ArrowLeft, ArrowRight, Plus, Search } from 'lucide-solid'
import { toastStore } from '../../store'
import { Pill } from '/web/shared/Card'

const ChubNavigation: Component<{ buttons: boolean }> = (props) => {
  const state = chubStore()

  const update = (page?: number) => {
    if (page !== undefined) {
      chubStore.setPage(page)
    }

    chubStore.getBooks()
    chubStore.getChars()
  }

  onMount(update)

  const onSearch = (
    ev: Event & {
      target: Element
      currentTarget: HTMLInputElement | HTMLTextAreaElement
    }
  ) => {
    chubStore.setSearch(ev.currentTarget.value)
  }

  return (
    <>
      <div class="mt-2 flex flex-col justify-between gap-1">
        <div class="flex flex-wrap gap-2">
          <TextInput
            class="py-1"
            fieldName="search"
            placeholder="Search by name..."
            value={state.search}
            onChange={(ev) => onSearch(ev)}
            onKeyUp={(ev) => {
              if (ev.key !== 'Enter') return
              update()
            }}
          />
          <Button onClick={() => update(1)}>
            <Search size={16} />
          </Button>
          <Show when={props.buttons}>
            <Button
              schema="secondary"
              class="rounded-xl"
              onClick={() => {
                if (state.page > 1) {
                  chubStore.setPage(state.page - 1)
                  update()
                } else {
                  toastStore.error('Already on first page!')
                }
              }}
            >
              <ArrowLeft size={16} />
            </Button>

            <div class="w-12">
              <TextInput
                fieldName="number"
                value={state.page}
                onChange={(ev) => {
                  const n = Number(ev.currentTarget.value)
                  if (!isNaN(n) && n !== 0) {
                    chubStore.setPage(n)
                    update()
                  } else {
                    toastStore.error('Not a valid page number.')
                  }
                }}
              />
            </div>
            <Button
              schema="secondary"
              class="rounded-xl"
              onClick={() => {
                if (state.chars.length % 48 == 0) {
                  chubStore.setPage(state.page + 1)
                  update()
                } else {
                  toastStore.error(`Already on last page!`)
                }
              }}
            >
              <ArrowRight size={16} />
            </Button>
          </Show>
        </div>

        <Tags />
      </div>
    </>
  )
}

export default ChubNavigation

const Tags: Component = () => {
  const state = chubStore()
  const [text, setText] = createSignal('')

  const onDone = () => {
    const next = tags().concat(text().trim()).join(',')
    chubStore.setTags(next)
    setText('')
    update()
  }

  const remove = (index: number) => {
    const curr = tags()
    const next = curr.toSpliced(index, 1)
    chubStore.setTags(next.join(','))
    update()
  }

  const update = () => {
    chubStore.setPage(1)
    chubStore.getChars()
    chubStore.getBooks()
  }

  const tags = createMemo(() =>
    state.tags
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t!!)
  )

  return (
    <div class="flex gap-2">
      <TextInput
        class="px-1 py-1"
        placeholder="Enter tag"
        value={text()}
        onChange={(ev) => setText(ev.currentTarget.value)}
        onKeyUp={createOnEnter(onDone)}
      />
      <Button onClick={onDone}>
        <Plus size={16} />
      </Button>
      <div class="flex flex-wrap gap-1">
        <For each={tags()}>
          {(tag, i) => (
            <Pill
              small
              class="px-0.5 py-0.5 !text-xs hover:cursor-pointer"
              onClick={() => remove(i())}
            >
              {tag}
            </Pill>
          )}
        </For>
      </div>
    </div>
  )
}
