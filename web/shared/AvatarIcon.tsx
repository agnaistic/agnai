import { Component } from 'solid-js'

const AvatarIcon: Component<{ avatarUrl?: string }> = (props) => {
  if (props.avatarUrl) {
    return <img class="mx-2 h-8 w-8 rounded-full" src={props.avatarUrl} />
  }

  return <div class="w- mx-2 h-8 w-8 rounded-full bg-slate-700"></div>
}

export default AvatarIcon
