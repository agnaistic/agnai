import { Component, For, Show, createMemo, onMount } from 'solid-js'
import { chubStore } from '../../store/chub'
import TextInput from '../../shared/TextInput'
import Button from '../../shared/Button'
import { ArrowLeft, ArrowRight, Search } from 'lucide-solid'
import { Pill } from '/web/shared/Card'
import { Combobox } from '/web/shared/Combobox'

const ChubNavigation: Component<{ buttons: boolean; page: 'books' | 'chars' }> = (props) => {
  const state = chubStore()

  const update = (page?: number) => {
    if (page !== undefined) {
      chubStore.setPage(page)
    }

    chubStore.getEntities(props.page)
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
                }
              }}
            >
              <ArrowLeft size={16} />
            </Button>

            <div class="w-12">
              <TextInput
                class="py-1"
                fieldName="number"
                value={state.page}
                onChange={(ev) => {
                  const n = +ev.currentTarget.value
                  if (!isNaN(n) && n !== 0) {
                    chubStore.setPage(n)
                    update()
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

  const addTag = (tag: string) => {
    const next = tags().concat(tag.trim()).join(',')
    chubStore.setTags(next)
    chubStore.getEntities()
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
    chubStore.getEntities()
  }

  const tags = createMemo(() =>
    state.tags
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t!!)
  )

  const officialTags = createMemo(() => {
    const list = state.officialTags.tags
      .map((tag) => ({
        label: `${tag.name} (${tag.non_private_projects_count})`,
        value: tag.name.toLowerCase().trim(),
        count: tag.non_private_projects_count,
      }))
      .sort((l, r) => r.count - l.count)
    return list
  })

  return (
    <div class="flex gap-2">
      <Combobox
        items={officialTags()}
        onClick={(item) => addTag(item.value)}
        autoClose
        placeholder="Tags..."
      />

      <div class="flex flex-wrap items-center gap-1">
        <For each={tags()}>
          {(tag, i) => (
            <Pill
              small
              type="hl"
              inverse
              class="px-0.5 py-0.5 !text-sm hover:cursor-pointer"
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
