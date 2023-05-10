import { Component } from 'solid-js'
import TextInput from '../../shared/TextInput'
import { Toggle } from '../../shared/Toggle'
import Select from '../../shared/Select'
import { toDropdownItems } from '../../shared/util'
import { chubStore, getChubBooks, getChubChars } from '../../store/chub'
import { setChubPage } from './ChubNavigation'

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
  const update = () => {
    setChubPage(1)
    getChubChars()
    getChubBooks()
  }

  return (
    <>
      <Toggle
        fieldName="nsfw"
        label="NSFW"
        helperText="Allow NSFW characters/lorebooks to appear in results."
        value={chubStore().nsfw}
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
        value={chubStore().tags}
        onChange={(ev) => {
          chubStore.setTags(ev.currentTarget.value)
          update()
        }}
      />
      <TextInput
        fieldName="excludeTags"
        label="Exclude Tags"
        helperText="A comma-separated list of tags to exclude."
        placeholder="E.g. furry,incest,loli"
        value={chubStore().excludeTags}
        onChange={(ev) => {
          chubStore.setExcludeTags(ev.currentTarget.value)
          update()
        }}
      />
      <Select
        fieldName="sort"
        label="Sort By"
        items={toDropdownItems(sorts)}
        value={chubStore().sort}
        onChange={(v) => {
          chubStore.setSort(v.value)
          update()
        }}
      />
    </>
  )
}

export default FilterSettings
