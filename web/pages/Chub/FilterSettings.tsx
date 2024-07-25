import { Component } from 'solid-js'
import TextInput from '../../shared/TextInput'
import { Toggle } from '../../shared/Toggle'
import Select from '../../shared/Select'
import { toDropdownItems } from '../../shared/util'
import { chubStore } from '../../store/chub'

const sorts = [
  'Download Count',
  'ID',
  'Rating',
  'Rating Count',
  'Last Activity',
  'Creation Date',
  'Name',
  'Token Count',
]

const FilterSettings: Component = () => {
  const state = chubStore()
  // const [include, setInclude] = createSignal<string[]>([])
  // const [exclude, setExclude] = createSignal<string[]>([])

  const update = () => {
    chubStore.setPage(1)
    chubStore.getChars()
    chubStore.getBooks()
  }

  // const available = createMemo(() => {
  //   const inc = new Set(include())
  //   const exc = new Set(exclude())

  //   return state.officialTags
  //     .filter((tag) => !inc.has(tag.name) && !exc.has(tag.name))
  //     .map((t) => ({
  //       label: `${t.name} (${t.non_private_projects_count})`,
  //       value: t.name,
  //     }))
  // })

  // createEffect(() => {
  //   const includes = include()
  //   chubStore.setTags(includes.join(','))
  //   update()
  // })

  // createEffect(() => {
  //   const excludes = exclude()
  //   chubStore.setExcludeTags(excludes.join(','))
  //   update()
  // })

  return (
    <div class="relative flex flex-col gap-2">
      <Toggle
        fieldName="nsfw"
        label="NSFW"
        helperText="Allow NSFW characters/lorebooks to appear in results."
        value={state.nsfw}
        onChange={(v) => {
          chubStore.setNSFW(v)
          update()
        }}
      />

      {/* <TagInput
        label="Includes"
        helperText="Tags to include from search"
        availableTags={available()}
        onSelect={setInclude}
        fieldName="chub_includes"
      />

      <TagInput
        label="Excludes"
        helperText="Tags to exclude from search"
        availableTags={available()}
        onSelect={setExclude}
        fieldName="chub_excludes"
      /> */}

      <TextInput
        fieldName="tags"
        label="Query Tags"
        helperText="A comma-separated list of tags to include."
        placeholder="E.g. blue_archive,female,anime"
        value={state.tags}
        onChange={(ev) => {
          chubStore.setTags(ev.currentTarget.value)
          update()
        }}
      />
      <TextInput
        fieldName="excludeTags"
        label="Exclude Tags"
        helperText="A comma-separated list of tags to exclude."
        value={state.excludeTags}
        onChange={(ev) => {
          chubStore.setExcludeTags(ev.currentTarget.value)
          update()
        }}
      />

      <Select
        fieldName="sort"
        label="Sort By"
        items={toDropdownItems(sorts)}
        value={state.sort}
        onChange={(v) => {
          chubStore.setSort(v.value)
          update()
        }}
      />
    </div>
  )
}

export default FilterSettings
