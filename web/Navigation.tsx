import { A, useNavigate } from '@solidjs/router'
import {
  Activity,
  Book,
  Bot,
  Github,
  HeartHandshake,
  Info,
  LogIn,
  LogOut,
  MailPlus,
  MessageCircle,
  Settings,
  Sliders,
  User,
  VenetianMask,
} from 'lucide-solid'
import { Component, createMemo, createSignal, JSX, Show } from 'solid-js'
import AvatarIcon from './shared/AvatarIcon'
import { characterStore, inviteStore, settingStore, userStore } from './store'
import ImpersonateModal from './pages/Character/ImpersonateModal'

const Navigation: Component = () => {
  const state = settingStore()
  const user = userStore()
  const chars = characterStore()
  const nav = useNavigate()
  const [impersonate, setImpersonate] = createSignal(false)

  const logout = () => {
    nav('/')
    userStore.logout()
  }

  const hide = createMemo(() => (state.showMenu ? '' : 'drawer--hide'))
  const fullscreen = createMemo(() => (state.fullscreen ? 'hidden' : ''))

  return (
    <>
      <div
        data-menu=""
        class={`drawer flex flex-col gap-4 bg-[var(--bg-800)] pt-4 ${hide()} ${fullscreen()}`}
      >
        <div class="drawer__content flex flex-col gap-2 px-4">
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
        {/* <div class="flex flex-row justify-around text-xs">
        <Item href="/terms-of-service">Terms</Item>
        <Item href="/privacy-policy">Privacy Policy</Item>
      </div> */}
        <div class="flex h-16 w-full flex-col items-center justify-between border-t-2 border-[var(--bg-700)] px-4">
          <div class="ellipsis my-auto flex w-full items-center justify-between">
            <div
              class="flex max-w-[calc(100%-32px)] items-center gap-2"
              onClick={() => {
                setImpersonate(true)
                settingStore.closeMenu()
              }}
            >
              <AvatarIcon
                avatarUrl={chars.impersonating?.avatar || user.profile?.avatar}
                format={{ corners: 'circle', size: 'md' }}
              />
              <div class="ellipsis flex cursor-pointer items-center justify-end rounded-lg bg-[var(--bg-700)] px-2 py-1">
                <div class="ellipsis flex flex-col">
                  <span>{chars.impersonating?.name || user.profile?.handle}</span>
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
      <ImpersonateModal show={impersonate()} close={() => setImpersonate(false)} />
    </>
  )
}

const UserNavigation: Component = () => {
  const user = userStore()
  const cfg = settingStore()

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

      <Show when={cfg.config.patreon}>
        <ExternalLink href="https://patreon.com/Agnaistic" newtab>
          <HeartHandshake /> Patreon
        </ExternalLink>
      </Show>

      <Item href="/info">
        <Info />
        Information
      </Item>
    </>
  )
}

const GuestNavigation: Component = () => {
  const menu = settingStore((s) => ({
    showMenu: s.showMenu,
    config: s.config,
    guest: s.guestAccessAllowed,
  }))

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

      <Item href="/info">
        <Info />
        Information
      </Item>

      <ExternalLink href="https://github.com/agnaistic/agnai" newtab>
        <Github />
        GitHub
      </ExternalLink>
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

const ExternalLink: Component<{ href: string; newtab?: boolean; children?: any }> = (props) => (
  <a
    class="flex h-12 items-center justify-start gap-4 rounded-xl px-2 hover:bg-[var(--bg-700)]"
    href={props.href}
    target={props.newtab ? '_blank' : ''}
  >
    {props.children}
  </a>
)
