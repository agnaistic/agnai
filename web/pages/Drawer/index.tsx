import { A } from '@solidjs/router'
import { LogOut, Settings, User, Users } from 'lucide-solid'
import { Component, JSX, Show } from 'solid-js'
import AvatarIcon from '../../shared/AvatarIcon'
import { userStore } from '../../store'
import './drawer.css'

const Drawer: Component = () => {
  const state = userStore()

  return (
    <Show when={state.loggedIn}>
      <div class={`drawer flex flex-col gap-4 pt-4 ${state.showMenu ? '' : 'drawer--hide'}`}>
        <div class="drawer__content flex flex-col gap-2 px-4">
          <Item href="/profile">
            <User /> Profile
          </Item>

          <Item href="/character/list">
            <Users /> Characters
          </Item>

          <Item href="/settings">
            <Settings /> Settings
          </Item>
        </div>
        <div class="flex h-16 w-full items-center justify-between border-t-2 border-slate-800 px-4 ">
          <div class="flex items-center gap-4">
            <AvatarIcon avatarUrl={state.profile?.avatar} />
            <div>{state.profile?.handle}</div>
          </div>
          <div onClick={userStore.logout}>
            <LogOut class="cursor-pointer text-white/50 hover:text-white" />
          </div>
        </div>
      </div>
    </Show>
  )
}

const Item: Component<{ href: string; children: string | JSX.Element }> = (props) => {
  return (
    <A
      href={props.href}
      class="flex h-12 items-center justify-start gap-4 rounded-xl px-2 hover:bg-slate-700 "
    >
      {props.children}
    </A>
  )
}

export default Drawer
