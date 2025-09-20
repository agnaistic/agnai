import { Component, JSX, Show } from 'solid-js'

export function Selectable<T>(props: {
  selecting?: boolean
  selected: boolean
  onSelect: () => void
  children: any
}): JSX.Element {
  return (
    <div class="relative">
      <Show when={props.selecting}>
        <div class="bg-500 absolute flex h-full w-full opacity-30"></div>
        <div
          class="absolute z-10 flex h-full w-full cursor-pointer items-center justify-center"
          onClick={props.onSelect}
        >
          <Checkbox selected={props.selected} class="!h-6 !w-6" />
        </div>
      </Show>
      {props.children}
    </div>
  )
}

const Checkbox: Component<{ onClick?: () => void; selected: boolean; class?: string }> = (
  props
) => {
  return (
    <div class="inline-flex items-center" onClick={() => props.onClick?.()}>
      <label class="relative flex cursor-pointer items-center">
        <input
          type="checkbox"
          checked={props.selected}
          class={
            'peer h-5 w-5 cursor-pointer appearance-none rounded border-[2px] border-[var(--bg-800)] bg-[var(--bg-600)] shadow transition-all checked:border-[var(--hl-800)] checked:bg-[var(--green-700)] hover:shadow-md ' +
            (props.class || '')
          }
          id="check"
        />
        <span class="text-900 pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 transform opacity-0 peer-checked:opacity-100">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-3.5 w-3.5"
            viewBox="0 0 20 20"
            fill="currentColor"
            stroke="currentColor"
            stroke-width="1"
          >
            <path
              fill-rule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clip-rule="evenodd"
            ></path>
          </svg>
        </span>
      </label>
    </div>
  )
}
