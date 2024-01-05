import { Component, For, JSX, createEffect, createSignal } from 'solid-js'
import { FormLabel } from './FormLabel'

interface TagInputProps {
  availableTags: string[]
  value?: string[]
  fieldName: string
  label?: string
  helperText?: string | JSX.Element
  placeholder?: string
  disabled?: boolean
  onSelect: (selectedTags: string[]) => void

  /** Will only allow 'availableTags' to be used */
  strict?: boolean
}

const TagInput: Component<TagInputProps> = (props) => {
  const [tags, setTags] = createSignal<string[]>([])
  const [inputValue, setInputValue] = createSignal<string>('')
  const [suggestions, setSuggestions] = createSignal<string[]>([])

  createEffect(() => {
    setTags(props.value || [])
  })

  function updateSuggestions(value: string) {
    setSuggestions(
      props.availableTags.filter((tag) => tag.startsWith(value) && !tags().includes(tag))
    )
  }

  function addTag(tag: string) {
    const updatedTags = Array.from(new Set([...tags(), tag]))

    if (props.strict) {
      const match = props.availableTags.some((existing) => existing === tag)
      if (!match) return
    }

    setTags(updatedTags)
    setInputValue('')
    setSuggestions([])
    props.onSelect(updatedTags)
  }

  function removeTag(tagToRemove: string) {
    const updatedTags = tags().filter((tag) => tag !== tagToRemove)
    setTags(updatedTags)
    props.onSelect(updatedTags)
  }

  function handleInputChange(e: Event) {
    setInputValue((e.target as HTMLInputElement).value)
    updateSuggestions((e.target as HTMLInputElement).value)
  }

  function handleInputKeyDown(e: KeyboardEvent) {
    const lastTag = tags()[tags().length - 1]
    const value = inputValue()
    if (e.key === 'Backspace' && value === '' && lastTag) {
      removeTag(lastTag)
    } else if (e.key === 'Enter' && value !== '' && suggestions().length > 0) {
      e.preventDefault()
      addTag(suggestions()[0])
    } else if ((e.key === ',' || e.key == 'Enter') && value !== '') {
      e.preventDefault()
      addTag(value)
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
          placeholder={tags().length || inputValue() ? '' : props.placeholder ?? 'Add tags...'}
          disabled={props.disabled}
        />
      </div>
      <ul class="absolute left-0 z-10 mt-1 bg-white text-gray-800 shadow-md">
        <For each={suggestions()}>
          {(suggestion) => (
            <li
              class="cursor-pointer px-2 py-1 hover:bg-gray-200"
              onClick={() => addTag(suggestion)}
            >
              {suggestion}
            </li>
          )}
        </For>
      </ul>
    </div>
  )
}

export default TagInput
