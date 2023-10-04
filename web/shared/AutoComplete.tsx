import { createSignal, onCleanup, onMount } from 'solid-js'
import { Component, For } from 'solid-js'

type Option = {
  label: string
  value: string
}

export const AutoComplete: Component<{
  options: Option[]
  onSelect: (option: Option) => void
  close: () => void
  dir: 'up' | 'down'
  /**
   * down: offset is top: {offset}px
   * up: offset is bottom: {offset}px
   */
  offset?: number
}> = (props) => {
  const [selected, setSelected] = createSignal(0)

  const clamp = (value: number) => {
    if (value >= props.options.length) {
      return 0
    }

    if (value < 0) {
      return props.options.length - 1
    }

    return value
  }

  const listener = (ev: KeyboardEvent) => {
    const mod = props.dir === 'up' ? -1 : 1
    console.log('autocomplete', ev.key)
    const curr = selected()
    if (ev.key === 'ArrowUp') {
      ev.preventDefault()
      setSelected(clamp(curr - 1 * mod))
      return
    }

    if (ev.key === 'ArrowDown') {
      ev.preventDefault()
      setSelected(clamp(curr + 1 * mod))
      return
    }

    if (ev.key === 'Enter') {
      ev.preventDefault()
      const option = props.options[curr]
      props.onSelect(option)
      document.removeEventListener('keydown', listener)
      props.close()
      return
    }

    props.close()
    document.removeEventListener('keydown', listener)
  }

  onMount(() => {
    document.addEventListener('keydown', listener)
  })

  onCleanup(() => {
    document.removeEventListener('keydown', listener)
  })

  return (
    <ul
      class="bg-900 absolute left-0 flex max-h-40 w-56 flex-col gap-[2px] overflow-y-auto rounded-md border-[1px] border-[var(--bg-700)]"
      classList={{ 'flex-col-reverse': props.dir === 'up' }}
      style={{
        [props.dir === 'up' ? 'bottom' : 'top']: `${props.offset ?? 44}px`,
      }}
    >
      <For each={props.options}>
        {(opt, i) => (
          <li
            class="ellipsis cursor-pointer px-2 pb-2 pt-1 text-sm hover:bg-[var(--bg-700)]"
            classList={{ 'bg-600': i() === selected(), 'bg-800': i() !== selected() }}
            onClick={() => props.onSelect(opt)}
          >
            {opt.label}
          </li>
        )}
      </For>
    </ul>
  )
}
