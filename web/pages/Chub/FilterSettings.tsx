import { Component } from 'solid-js'
import TextInput from '../../shared/TextInput'
import { Toggle } from '../../shared/Toggle'
import { chubOptions } from './Chub'
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
  return (
    <>
      <Toggle
        fieldName="nsfw"
        label="NSFW"
        helperText="Allow NSFW characters/lorebooks to appear in results."
        value={chubOptions.nsfw}
        onChange={(v) => {
          chubOptions.nsfw = v
          chubStore.getChubChars()
          chubStore.getChubBooks()
        }}
      />
      <TextInput
        fieldName="tags"
        label="Query Tags"
        helperText="A comma-separated list of tags to include."
        placeholder="E.g. blue_archive,female,anime"
        value={chubOptions.tags}
        onChange={(ev) => {
          chubOptions.tags = ev.currentTarget.value
          chubStore.getChubChars()
          chubStore.getChubBooks()
        }}
      />
      <TextInput
        fieldName="excludeTags"
        label="Exclude Tags"
        helperText="A comma-separated list of tags to exclude."
        placeholder="E.g. furry,incest,loli"
        value={chubOptions.excludeTags}
        onChange={(ev) => {
          chubOptions.excludeTags = ev.currentTarget.value
          chubStore.getChubChars()
          chubStore.getChubBooks()
        }}
      />
      <Select
        fieldName="sort"
        label="Sort By"
        items={toDropdownItems(sorts)}
        value={chubOptions.sort}
        onChange={(v) => {
          chubOptions.sort = v.value
          chubStore.getChubChars()
          chubStore.getChubBooks()
        }}
      />
    </>
  )
}

export default FilterSettings
