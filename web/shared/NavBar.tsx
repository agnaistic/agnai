import { LogOut, MessageCircle, Settings, Sliders, User, Users, Zap } from 'lucide-solid'
import { Component, Show } from 'solid-js'
import { A } from '@solidjs/router'
import { userStore } from '../store'

const NavBar: Component = () => {
  const logout = () => {
    userStore.logout()
  }

  return (
    <span class="flex justify-between gap-4 bg-background-lighter px-8 py-5 shadow-xl max-sm:p-3">
      <span class="flex items-center gap-2 font-semibold">
        <A href="/">
          Agn<span class="text-purple-400">AI</span>stic
        </A>
      </span>
      <span class="flex gap-4">
        <A aria-label="User Profile" class="focusable-icon-button rounded p-1" href="/profile">
          <User />
        </A>

        <A
          aria-label="Character Settings"
          class="focusable-icon-button rounded p-1"
          href="/character/list"
        >
          <Users />
        </A>

        <A aria-label="Chat" class="focusable-icon-button rounded p-1" href="/chat">
          <MessageCircle />
        </A>

        {/* <A
        aria-label="Generation Settings"
        class="focusable-icon-button rounded p-1"
        href="/generation-settings"
      >
        <Sliders />
      </A> */}

        <A aria-label="Settings" class="focusable-icon-button rounded p-1" href="/settings">
          <Settings />
        </A>

        <Show when={true}>
          <div
            aria-label="Logout"
            class="focusable-icon-button cursor-pointer rounded p-1"
            onClick={logout}
          >
            <LogOut />
          </div>
        </Show>
      </span>
    </span>
  )
}
export default NavBar
