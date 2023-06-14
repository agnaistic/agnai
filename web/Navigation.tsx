import { A, useNavigate } from '@solidjs/router'
import {
  Activity,
  Book,
  Bot,
  Github,
  HeartHandshake,
  LogIn,
  LogOut,
  MailPlus,
  MessageCircle,
  Settings,
  ShoppingBag,
  Sliders,
  User,
  VenetianMask,
} from 'lucide-solid'
import { Component, createMemo, JSX, Show } from 'solid-js'
import AvatarIcon from './shared/AvatarIcon'
import { characterStore, chatStore, inviteStore, settingStore, userStore } from './store'
import Slot from './shared/Slot'
import { useEffect, useWindowSize } from './shared/hooks'

const Navigation: Component = () => {
  let parent: any
  let content: any
  const state = settingStore()
  const user = userStore()
  const chars = characterStore()
  const chat = chatStore()
  const nav = useNavigate()

  const logout = () => {
    nav('/')
    userStore.logout()
  }

  useEffect(() => {
    const interval = setInterval(() => {
      if (!parent || !content) return

      parent.setAttribute('style', '')
      content.setAttribute('style', '')
    }, 50)

    return () => clearInterval(interval)
  })

  const hide = createMemo(() => (state.showMenu ? '' : 'drawer--hide'))
  const fullscreen = createMemo(() =>
    state.fullscreen || (chat.opts.editingChar && !state.showMenu) ? 'hidden' : ''
  )

  return (
    <>
      <div ref={parent} class={`drawer bg-800 flex flex-col gap-2 pt-2 ${hide()} ${fullscreen()}`}>
        <div ref={content} class="drawer__content flex flex-col gap-1 px-4 sm:gap-2">
          <div class="hidden w-full items-center justify-center sm:flex">
            <A href="/">
              <div class="h-7 w-fit items-center justify-center rounded-lg px-4 font-bold">
                Agn<span class="text-[var(--hl-500)]">ai</span>stic
              </div>
            </A>
          </div>
          <Show when={user.loggedIn} fallback={<GuestNavigation />}>
            <UserNavigation />
          </Show>
        </div>

        <div class="absolute bottom-0 flex h-16 w-full flex-col items-center justify-between border-t-2 border-[var(--bg-700)] px-4">
          <div class="ellipsis my-auto flex w-full items-center justify-between">
            <div
              class="flex max-w-[calc(100%-32px)] items-center gap-2"
              onClick={() => {
                settingStore.toggleImpersonate(true)
                settingStore.closeMenu()
              }}
            >
              <AvatarIcon
                avatarUrl={chars.impersonating?.avatar || user.profile?.avatar}
                format={{ corners: 'circle', size: 'md' }}
              />
              <div class="ellipsis flex cursor-pointer items-center justify-end rounded-lg bg-[var(--bg-700)] px-2 py-1">
                <div class="ellipsis flex flex-col">
                  <span>
                    {chars.impersonating?.name || user.profile?.handle}
                    {state.flags.charv2 ? ' (v2)' : ''}
                  </span>
                </div>
                <Show when={!!chars.impersonating}>
                  <VenetianMask size={16} class="ml-2" />
                </Show>
              </div>
            </div>
            <div onClick={logout} class="icon-button cursor-pointer ">
              <LogOut />
            </div>
          </div>
          <div class="text-500 mb-1 text-[0.6rem] italic">{state.config.version}</div>
        </div>
      </div>
    </>
  )
}

const UserNavigation: Component = () => {
  const user = userStore()
  const menu = settingStore()
  const page = useWindowSize()

  return (
    <>
      <Item href="/profile">
        <User /> Profile
      </Item>

      <Show when={menu.flags.chub}>
        <Item href="/chub">
          <ShoppingBag />
          CHUB
        </Item>
      </Show>

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

      <Show when={menu.config.patreon}>
        <ExternalLink href="https://patreon.com/Agnaistic" newtab>
          <HeartHandshake /> Patreon
        </ExternalLink>
      </Show>

      <Show when={page.width() >= 1024}>
        <Slot slot="menu" />
      </Show>
    </>
  )
}

const GuestNavigation: Component = () => {
  const menu = settingStore((s) => ({
    showMenu: s.showMenu,
    config: s.config,
    guest: s.guestAccessAllowed,
    flags: s.flags,
  }))
  const page = useWindowSize()

  return (
    <>
      <Show when={menu.config.canAuth}>
        <Item href="/login">
          <LogIn /> Login
        </Item>
      </Show>

      <Show when={menu.guest}>
        <Item href="/profile">
          <User /> Profile
        </Item>

        <Item href="/character/list">
          <Bot /> Characters
        </Item>

        <Show when={menu.flags.chub}>
          <Item href="/chub">
            <ShoppingBag />
            CHUB
          </Item>
        </Show>

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
      </Show>

      <Show when={menu.config.patreon}>
        <ExternalLink href="https://patreon.com/Agnaistic" newtab>
          <HeartHandshake /> Patreon
        </ExternalLink>
      </Show>

      <ExternalLink href="https://github.com/agnaistic/agnai" newtab>
        <Github />
        GitHub
      </ExternalLink>

      <Show when={page.width() >= 1024}>
        <Slot slot="menu" />
      </Show>
    </>
  )
}

const Item: Component<{ href: string; children: string | JSX.Element }> = (props) => {
  return (
    <A
      href={props.href}
      class="sm:text-md flex h-10 items-center justify-start gap-4 rounded-lg px-2 text-sm hover:bg-[var(--bg-700)] sm:h-12 "
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

const ExternalLink: Component<{ href: string; newtab?: boolean; children?: any }> = (props) => (
  <a
    class="flex h-12 items-center justify-start gap-4 rounded-xl px-2 hover:bg-[var(--bg-700)]"
    href={props.href}
    target={props.newtab ? '_blank' : ''}
  >
    {props.children}
  </a>
)
