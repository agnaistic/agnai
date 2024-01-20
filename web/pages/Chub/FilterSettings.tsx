import { Component } from 'solid-js'
import TextInput from '../../shared/TextInput'
import { Toggle } from '../../shared/Toggle'
import Select from '../../shared/Select'
import { toDropdownItems } from '../../shared/util'
import { chubStore } from '../../store/chub'
import { useTransContext } from '@mbarzda/solid-i18next'

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
  const [t] = useTransContext()

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
        label={t('nsfw')}
        helperText={t('allow_nsfw_characters_to_appear_in_results')}
        value={state.nsfw}
        onChange={(v) => {
          chubStore.setNSFW(v)
          update()
        }}
      />
      <TextInput
        fieldName="tags"
        label={t('query_tags')}
        helperText={t('a_comma_separated_list_of_tags_to_include')}
        placeholder={t('query_tags_example')}
        value={state.tags}
        onChange={(ev) => {
          chubStore.setTags(ev.currentTarget.value)
          update()
        }}
      />
      <TextInput
        fieldName="excludeTags"
        label={t('exclude_tags')}
        helperText={t('a_comma_separated_list_of_tags_to_exclude')}
        value={state.excludeTags}
        onChange={(ev) => {
          chubStore.setExcludeTags(ev.currentTarget.value)
          update()
        }}
      />
      <Select
        fieldName="sort"
        label={t('sort_by')}
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
