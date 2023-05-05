import { A } from '@solidjs/router'
import { Component } from 'solid-js'

export const ChubChar: Component<{
  name: string
  avatar: string
}> = (props) => {
  return (
    <div class="flex flex-col items-center justify-between gap-1 rounded-md bg-[var(--bg-800)] p-1">
      <div class="w-full">
        <A href={`/character/`} class="block h-32 w-full justify-center overflow-hidden rounded-lg">
          <img
            src={props.avatar}
            class="h-full w-full object-cover"
            style="object-position: 50% 30%;"
          />
        </A>
      </div>
      <div class="w-full overflow-hidden text-ellipsis whitespace-nowrap px-1 text-sm font-bold">
        {props.name}
      </div>
    </div>
  )
}
