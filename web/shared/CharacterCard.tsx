import { Component } from 'solid-js'
import { A } from '@solidjs/router'
import { AppSchema } from '../../srv/db/schema'

const CharacterCard: Component<{ character: AppSchema.Character; href: string }> = (props) => (
  <A href={props.href} class="focusable-card group flex flex-col gap-1">
    <div
      style={{ 'background-image': `url(${props.character.avatarUrl})` }}
      class="h-40 w-40 rounded-t-md bg-zinc-200 bg-cover"
    >
      <div class="_focusable-base h-full w-full bg-white/0 group-hover:bg-white/5 group-active:bg-white/10" />
    </div>

    <div class="p-3">
      <b class="truncate">{props.character.name}</b>
      <p class="text-sm text-white/75">{props.character.description}</p>
    </div>
  </A>
)

export default CharacterCard
