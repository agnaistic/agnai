import { Component } from 'solid-js'
import TextInput from '../../shared/TextInput'
import { Toggle } from '../../shared/Toggle'
import Select from '../../shared/Select'
import { toDropdownItems } from '../../shared/util'
import { chubStore } from '../../store/chub'

const SORTS = {
  default: 'Default',
  trending: 'Trending',
  n_favorites: '# Favorites',
  random: 'Random',
  rating: 'Rating',
  last_activity_at: 'Updated',
  star_count: 'Popularity',
  created_at: 'Created',
  name: 'Name',
  n_tokens: '# Tokens',
  rating_count: '# Ratings',
}

const FilterSettings: Component = () => {
  const state = chubStore((s) => ({
    nsfw: s.nsfw,
    tags: s.tags,
    excludeTags: s.excludeTags,
    sort: s.sort as keyof typeof SORTS,
  }))

  return (
    <div class="relative flex flex-col gap-2">
      <Toggle
        fieldName="nsfw"
        label="NSFW"
        helperText="Allow NSFW characters/lorebooks to appear in results."
        value={state.nsfw}
        onChange={(v) => {
          chubStore.setNSFW(v)
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
        }}
      />
      <TextInput
        fieldName="excludeTags"
        label="Exclude Tags"
        helperText="A comma-separated list of tags to exclude."
        value={state.excludeTags}
        onChange={(ev) => {
          chubStore.setExcludeTags(ev.currentTarget.value)
        }}
      />

      <Select
        fieldName="sort"
        label="Sort By"
        items={toDropdownItems(SORTS)}
        value={SORTS[state.sort] ? state.sort : 'trending'}
        onChange={(v) => {
          chubStore.setSort(v.value)
        }}
      />
    </div>
  )
}

export default FilterSettings
