import { A, useNavigate } from '@solidjs/router'
import {
  Activity,
  Book,
  Bot,
  Github,
  LogIn,
  LogOut,
  MailPlus,
  MessageCircle,
  Settings,
  Sliders,
  User,
} from 'lucide-solid'
import { Component, createMemo, JSX, Show } from 'solid-js'
import AvatarIcon from './shared/AvatarIcon'
import { inviteStore, settingStore, userStore } from './store'

const Navigation: Component = () => {
  const state = settingStore()
  const user = userStore()
  const nav = useNavigate()

  const logout = () => {
    nav('/')
    userStore.logout()
  }

  const hide = createMemo(() => (state.showMenu ? '' : 'drawer--hide'))
  const fullscreen = createMemo(() => (state.fullscreen ? 'hidden' : ''))

  return (
    <div
      data-menu=""
      class={`drawer flex flex-col gap-4 bg-[var(--bg-800)] pt-4 ${hide()} ${fullscreen()}`}
    >
      <div class="drawer__content flex flex-col gap-2 px-4">
        <div class="hidden w-full items-center justify-center sm:flex">
          <A href="/">
            <div class="h-7 w-fit items-center justify-center rounded-lg px-4">
              Agn<span class="font-bold text-[var(--hl-500)]">ai</span>stic
            </div>
          </A>
        </div>
        <Show when={user.loggedIn} fallback={<GuestNavigation />}>
          <UserNavigation />
        </Show>
      </div>
      <div class="flex h-16 w-full flex-col items-center justify-between border-t-2 border-[var(--bg-700)] px-4">
        <div class="mt-2 flex w-full items-center justify-between">
          <div class="flex items-center gap-4">
            <AvatarIcon
              avatarUrl={user.profile?.avatar}
              format={{ corners: 'circle', size: 'md' }}
            />
            <div>{user.profile?.handle}</div>
          </div>
          <div onClick={logout} class="icon-button cursor-pointer ">
            <LogOut />
          </div>
        </div>
        <div class="text-500 mb-1 text-[0.6rem] italic">{state.config.version}</div>
      </div>
    </div>
  )
}

const UserNavigation: Component = () => {
  const user = userStore()

  return (
    <>
      <Item href="/profile">
        <User /> Profile
      </Item>
      <Item href="/character/list">
        <Bot /> Characters
      </Item>
      <Item href="/chats">
        <MessageCircle /> Chats
      </Item>
      <Item href="/memory">
        <Book /> Memory
      </Item>
      <Item href="/invites">
        <MailPlus /> Invites <InviteBadge />
      </Item>
      <Item href="/settings">
        <Settings /> Settings
      </Item>
      <Item href="/presets">
        <Sliders /> Presets
      </Item>
      <Show when={user.user?.admin}>
        <Item href="/admin/metrics">
          <Activity /> Metrics
        </Item>
      </Show>
      <a
        class="flex h-12 items-center justify-start gap-4 rounded-xl px-2 hover:bg-[var(--bg-700)]"
        href="https://github.com/luminai-companion/agn-ai"
        target="_blank"
      >
        <Github />
        GitHub
      </a>
    </>
  )
}

const GuestNavigation: Component = () => {
  const menu = settingStore((s) => ({ showMenu: s.showMenu, config: s.config }))

  return (
    <>
      <Show when={menu.config.canAuth}>
        <Item href="/login">
          <LogIn /> Login
        </Item>
      </Show>

      <Item href="/profile">
        <User /> Profile
      </Item>

      <Item href="/character/list">
        <Bot /> Characters
      </Item>

      <Item href="/chats">
        <MessageCircle /> Chats
      </Item>

      <Item href="/memory">
        <Book /> Memory
      </Item>

      <Item href="/settings">
        <Settings /> Settings
      </Item>

      <Item href="/presets">
        <Sliders /> Presets
      </Item>

      <a
        class="flex h-12 items-center justify-start gap-4 rounded-xl px-2 hover:bg-[var(--bg-700)]"
        href="https://github.com/luminai-companion/agn-ai"
        target="_blank"
      >
        <Github />
        GitHub
      </a>
    </>
  )
}

const Item: Component<{ href: string; children: string | JSX.Element }> = (props) => {
  return (
    <A
      href={props.href}
      class="flex h-12 items-center justify-start gap-4 rounded-xl px-2 hover:bg-[var(--bg-700)] "
      onClick={settingStore.closeMenu}
    >
      {props.children}
    </A>
  )
}

const InviteBadge: Component = () => {
  const inv = inviteStore()

  return (
    <>
      <Show when={inv.invites.length}>
        <div class="flex h-6 items-center justify-center rounded-xl bg-red-900 px-2 text-xs">
          {inv.invites.length}
        </div>
      </Show>
    </>
  )
}

export default Navigation
