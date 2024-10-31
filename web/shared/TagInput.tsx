import { Component, For, JSX, createEffect, createSignal, Show } from 'solid-js'
import { FormLabel } from './FormLabel'
import { AutoComplete, AutoCompleteOption } from '/web/shared/AutoComplete'

type AvailableTag = string | { label: string; value: string }

interface TagInputProps {
  fieldName?: string
  availableTags: AvailableTag[]
  value?: string[]
  label?: string
  helperText?: string | JSX.Element
  placeholder?: string
  disabled?: boolean
  onSelect: (selectedTags: string[]) => void

  /** Will only allow 'availableTags' to be used */
  strict?: boolean
}

function isMatch(input: string, tag: AvailableTag) {
  if (typeof tag === 'string') return tag.toLowerCase().startsWith(input.toLowerCase())
  return tag.value.toLowerCase().startsWith(input.toLowerCase())
}

function toOption(tag: AvailableTag) {
  return typeof tag === 'string' ? { label: tag, value: tag } : tag
}

function toValue(tag: AvailableTag) {
  return typeof tag === 'string' ? tag : tag.value
}

const TagInput: Component<TagInputProps> = (props) => {
  const [tags, setTags] = createSignal<string[]>([])
  const [inputValue, setInputValue] = createSignal<string>('')
  const [suggestions, setSuggestions] = createSignal<AutoCompleteOption[]>([])

  createEffect(() => {
    setTags(props.value || [])
  })

  function updateSuggestions(value: string) {
    setSuggestions(
      props.availableTags
        .filter((tag) => isMatch(value, tag) && !tags().includes(toValue(tag)))
        .map(toOption)
    )
  }

  function resetSuggestions() {
    setSuggestions([])
  }

  function addTag(tagOrOption: string | AutoCompleteOption) {
    const tag = typeof tagOrOption === 'string' ? tagOrOption : tagOrOption.value
    const updatedTags = Array.from(new Set([...tags(), tag]))

    if (props.strict) {
      const match = props.availableTags.some((existing) => existing === tag)
      if (!match) return
    }

    setTags(updatedTags)
    setInputValue('')
    resetSuggestions()
    props.onSelect(updatedTags)
  }

  function removeTag(tagToRemove: string) {
    const updatedTags = tags().filter((tag) => tag !== tagToRemove)
    setTags(updatedTags)
    setInputValue('')
    props.onSelect(updatedTags)
  }

  function handleInputChange(e: Event) {
    setInputValue((e.target as HTMLInputElement).value)
    updateSuggestions((e.target as HTMLInputElement).value)
  }

  function handleInputKeyDown(e: KeyboardEvent) {
    const lastTag = tags()[tags().length - 1]
    const value = inputValue().trim()
    if (e.key === 'Backspace' && value === '' && lastTag) {
      removeTag(lastTag)
    } else if (e.key == 'Enter' && value !== '' && suggestions().length === 0) {
      e.preventDefault()
      addTag(value)
    } else if (e.key === ',' && value !== '') {
      e.preventDefault()
      addTag(value)
    }
  }

  function handleBlur(e: Event) {
    resetSuggestions()
    // do not leave trailing text in the input
    const value = inputValue().trim()
    if (value !== '' && value !== ',') {
      addTag(value)
    } else {
      setInputValue('')
    }
  }

  return (
    <div class="relative">
      <FormLabel label={props.label} helperText={props.helperText} />
      <div class="focusable-field flex w-full flex-wrap rounded-xl px-2 py-1">
        <For each={tags()}>
          {(tag) => (
            <span class="btn-primary m-1 flex items-center rounded px-2 py-1 text-sm text-white">
              {tag}
              <button class="ml-1" onClick={() => removeTag(tag)}>
                &times;
              </button>
            </span>
          )}
        </For>
        <input
          name={props.fieldName}
          class="form-field my-1 flex-1 bg-transparent outline-none"
          value={inputValue()}
          onInput={handleInputChange}
          onKeyDown={handleInputKeyDown}
          onBlur={handleBlur}
          placeholder={tags().length || inputValue() ? '' : props.placeholder ?? 'Add tags...'}
          disabled={props.disabled}
          autocomplete="off"
        />
      </div>
      <div class="relative">
        <Show when={suggestions().length > 0}>
          <AutoComplete
            options={suggestions()}
            onSelect={addTag}
            close={resetSuggestions}
            dir="down"
            offset={0}
            limit={5}
          />
        </Show>
      </div>
    </div>
  )
}

export default TagInput
