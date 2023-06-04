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

  const update = () => {
    chubStore.setPage(1)
    chubStore.getChars()
    chubStore.getBooks()
  }

  return (
    <>
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
    </>
  )
}

export default FilterSettings
