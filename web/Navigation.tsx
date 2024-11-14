import { A, useLocation, useSearchParams } from '@solidjs/router'
import {
  Activity,
  Bell,
  Book,
  ChevronLeft,
  ChevronRight,
  HeartHandshake,
  HelpCircle,
  Image,
  Info,
  LogIn,
  MailQuestion,
  Menu,
  MessageCircle,
  Moon,
  Plus,
  Settings,
  ShoppingBag,
  Sliders,
  Speaker,
  Sun,
  Volume2,
  VolumeX,
  Wand2,
} from 'lucide-solid'
import {
  Component,
  createEffect,
  createMemo,
  createSignal,
  JSX,
  Match,
  on,
  Show,
  Switch,
} from 'solid-js'
import AvatarIcon, { CharacterAvatar } from './shared/AvatarIcon'
import {
  UserState,
  announceStore,
  audioStore,
  characterStore,
  inviteStore,
  settingStore,
  toastStore,
  userStore,
} from './store'
import Slot from './shared/Slot'
import {
  isChatPage,
  useEffect,
  usePaneManager,
  useRef,
  useResizeObserver,
  useWindowSize,
} from './shared/hooks'
import WizardIcon from './icons/WizardIcon'
import { soundEmitter } from './shared/Audio/playable-events'
import Tooltip from './shared/Tooltip'
import { DiscordDarkIcon, DiscordLightIcon } from './icons/DiscordIcon'
import { Badge } from './shared/Card'
import { navStore } from './subnav'
import { getRgbaFromVar } from './shared/colors'
import { CallToAction } from './shared/CallToAction'
import Button from './shared/Button'
import { clearTours } from './tours'

const Navigation: Component = () => {
  let parent: any
  let content: any

  const state = settingStore()
  const user = userStore()
  const size = useWindowSize()
  const pane = usePaneManager()
  const nav = navStore()

  const [subnav, setSubnav] = createSignal(false)
  const isChat = isChatPage()

  createEffect(
    on(
      () => !!nav.body,
      () => {
        if (!nav.body) {
          setSubnav(false)
          return
        }

        setSubnav(true)
      }
    )
  )

  createEffect(() => {
    if (isChat()) return
    const platform = size.platform()

    if (platform === 'xl' && !state.showMenu) {
      settingStore.menu(true)
    }
  })

  const suffix = createMemo(() => (user.userLevel > 0 ? '+' : ''))

  useEffect(() => {
    const interval = setInterval(() => {
      if (!parent || !content) return

      parent.setAttribute('style', '')
      content.setAttribute('style', '')
    }, 50)

    return () => clearInterval(interval)
  })

  const dismissable = createMemo(() => {
    if (size.platform() !== 'xl') return true
    if (!isChat()) return false

    return true
  })

  const sha = createMemo(() => {
    const apiSha = state.config.version.startsWith('development')
      ? 'dev'
      : state.config.version.slice(0, 4)
    const webSha = window.agnai_version.startsWith('{{')
      ? ''
      : `/ ${window.agnai_version.slice(0, 4)}`

    return `${apiSha} ${webSha}`
  })

  return (
    <>
      <Show when={!state.showMenu && dismissable()}>
        <div
          class="icon-button absolute left-2 top-4 z-50 rounded-md px-2 py-2"
          style={{ background: getRgbaFromVar('bg-700', 0.3)?.background }}
          onClick={() => settingStore.menu(true)}
          classList={{ hidden: !isChat() }}
        >
          <Menu />
        </div>
      </Show>
      <div
        ref={parent}
        class={`drawer bg-800 flex flex-col gap-2 pt-2`}
        classList={{
          flex: !state.showMenu,
          'drawer--hide': dismissable() && !state.showMenu,
          'drawer--pane-open': pane.showing(),
        }}
        role="navigation"
        aria-label="Main"
      >
        <div ref={content} class="drawer__content sm:text-md text-md flex flex-col gap-1 sm:gap-1">
          <div class="flex w-full items-center justify-between px-2">
            <div
              class="icon-button flex w-2/12 justify-start p-1"
              onClick={() => {
                if (!dismissable()) return
                settingStore.menu()
              }}
            >
              <Menu classList={{ hidden: !dismissable() }} />
            </div>

            <Show when={nav.header && subnav()}>{nav.header}</Show>
            <Show when={!nav.header || !subnav()}>
              <A
                class="w-8/12 max-w-[calc(100%-64px)]"
                href="/"
                role="link"
                aria-label="Agnaistic main page"
              >
                <div
                  class="flex h-8 w-full items-center justify-center rounded-lg font-bold"
                  aria-hidden="true"
                >
                  Agn<span class="text-[var(--hl-500)]">ai</span>
                  {suffix()}
                </div>
              </A>
            </Show>

            <div class="flex w-2/12 justify-end">
              <Switch>
                <Match when={nav.body && subnav()}>
                  <div class="icon-button tour-main-menu" onClick={() => setSubnav(false)}>
                    <ChevronLeft />
                  </div>
                </Match>
                <Match when={nav.body && !subnav()}>
                  <div class="icon-button" onClick={() => setSubnav(true)}>
                    <ChevronRight />
                  </div>
                </Match>
              </Switch>
            </div>
          </div>

          <Switch>
            <Match when={subnav() && !!nav.body}>
              <Show when={nav.title}>
                <div class="text-500 flex w-full justify-center text-xs">{nav.title}</div>
              </Show>
              <div class="flex flex-col gap-1 px-2">{nav.body}</div>
              <Slots />
            </Match>
            <Match when={user.loggedIn}>
              <UserNavigation />
            </Match>
            <Match when>
              <GuestNavigation />
            </Match>
          </Switch>
        </div>

        <div
          class="absolute bottom-0 flex w-full flex-col items-center justify-between px-4"
          classList={
            {
              // 'h-8': state.config.policies,
              // 'h-4': !state.config.policies,
            }
          }
        >
          <SubCTA />
          <Show when={state.config.policies}>
            <div class="text-500 flex w-full justify-center gap-4 text-xs">
              <div>
                <A href="/terms-of-service">Term of Service</A>
              </div>
              <div>
                <A href="/privacy-policy">Privacy Policy</A>
              </div>
            </div>
          </Show>
          <div class="text-500 mb-1 text-[0.6rem] italic" role="contentinfo" aria-label="Version">
            ver. {sha()}
          </div>
        </div>
      </div>
    </>
  )
}

const UserNavigation: Component = () => {
  const user = userStore()
  const menu = settingStore()

  const guidance = createMemo(() => {
    const usable = menu.config.subs.some((sub) => sub.guidance)
    if (!usable) return false

    const access = !!menu.config.guidanceAccess || !!user.user?.admin
    return access
  })

  return (
    <>
      <div class="flex flex-col gap-1 px-2">
        <UserProfile />

        <Show when={menu.flags.chub}>
          <Item href="/chub" ariaLabel="Character hub">
            <ShoppingBag aria-hidden="true" />
            CHUB
          </Item>
        </Show>

        <CharacterLink />

        <ChatLink />

        <Show when={guidance()}>
          <Item href="/saga" ariaLabel="Sagas Preview">
            <Wand2 aria-hidden="true" />
            Sagas Preview
          </Item>
        </Show>

        <Library />
        <MultiItem>
          <Item href="/presets" ariaLabel="Presets">
            <Sliders aria-hidden="true" />
            <span aria-hidden="true">Presets</span>
          </Item>
          <EndItem>
            <A class="icon-button" href="/presets/new" role="button" aria-label="Add a new preset">
              <Plus aria-hidden="true" />
            </A>
          </EndItem>
        </MultiItem>

        <Show when={menu.flags.sounds}>
          <Sounds />
        </Show>

        <Show when={user.user?.admin}>
          <Item href="/admin/metrics" ariaLabel="Manage">
            <Activity aria-hidden="true" />
            <span aria-hidden="true">Manage</span>
          </Item>
          <SubMenu>
            <SubItem href="/admin/configuration" parent="/" ariaLabel="Configuration">
              Configuration
            </SubItem>
            <SubItem href="/admin/users" parent="/" ariaLabel="Users">
              Users
            </SubItem>
            <SubItem href="/admin/subscriptions" parent="/" ariaLabel="Subscriptions">
              Subscriptions
            </SubItem>
            <SubItem href="/admin/announcements" parent="/" ariaLabel="Announcements">
              Announcements
            </SubItem>
          </SubMenu>
        </Show>

        <NavIcons
          supportEmail={menu.config.serverConfig?.supportEmail}
          patreon={menu.config.patreon}
          user={user}
          showMenu={menu.showMenu}
          mode={user.ui.mode}
        />
      </div>

      <Slots />
    </>
  )
}

const GuestNavigation: Component = () => {
  const user = userStore()
  const menu = settingStore((s) => ({
    showMenu: s.showMenu,
    config: s.config,
    guest: s.guestAccessAllowed,
    flags: s.flags,
  }))

  return (
    <>
      <div class="flex flex-col gap-1 px-2">
        <Show when={menu.config.canAuth}>
          <Item
            href="/login"
            ariaLabel="Login to the application"
            onClick={() => soundEmitter.emit('menu-item-clicked', 'login')}
            class="tour-register"
          >
            <LogIn /> Login
          </Item>
        </Show>

        <Show when={menu.guest}>
          <UserProfile />

          <CharacterLink />

          <Show when={menu.flags.chub}>
            <Item href="/chub" ariaLabel="Character hub">
              <ShoppingBag aria-hidden="true" />
              CHUB
            </Item>
          </Show>

          <ChatLink />

          <Library />

          <MultiItem>
            <Item
              href="/presets"
              ariaLabel="Presets"
              onClick={() => soundEmitter.emit('menu-item-clicked', 'presets')}
            >
              <Sliders /> Presets
            </Item>
            <EndItem>
              <A
                class="icon-button"
                href="/presets/new"
                role="button"
                aria-label="Add a new preset"
              >
                <Plus aria-hidden="true" />
              </A>
            </EndItem>
          </MultiItem>

          <Show when={menu.flags.sounds}>
            <Sounds />
          </Show>
        </Show>

        <NavIcons
          supportEmail={menu.config.serverConfig?.supportEmail}
          patreon={menu.config.patreon}
          user={user}
          showMenu={menu.showMenu}
          mode={user.ui.mode}
        />
      </div>

      <Slots />
    </>
  )
}

const NavIcons: Component<{
  patreon?: boolean
  supportEmail?: string
  user: UserState
  showMenu: boolean
  mode: 'light' | 'dark'
}> = (props) => {
  const invites = inviteStore()
  const toasts = toastStore()
  const announce = announceStore()

  const count = createMemo(() => {
    const threshold = new Date(props.user.user?.announcement || 0).toISOString()
    const unseen = announce.list.filter(
      (l) => l.location === 'notification' && l.showAt > threshold
    )

    return unseen.length + toasts.unseen + invites.invites.length
  })

  return (
    <>
      <div class="flex flex-wrap justify-center gap-[2px] text-sm">
        <Show when={!!props.supportEmail}>
          <ExternalLink href={`mailto:${props.supportEmail}`} newtab ariaLabel="Email Support">
            <Tooltip position="top" tip={`${props.supportEmail}`}>
              <MailQuestion aria-hidden />
            </Tooltip>
          </ExternalLink>
        </Show>

        <Item href="/faq" ariaLabel="Open FAQ page">
          <HelpCircle aria-hidden="true" />
        </Item>

        <Item onClick={() => settingStore.modal(true)} ariaLabel="Open settings page">
          <Settings aria-hidden="true" />
        </Item>

        <Item
          onClick={() => settingStore.imageSettings(true)}
          ariaLabel="Image Settings"
          tooltip="Image Settings"
        >
          <Image aria-hidden="true" />
        </Item>

        <Item
          ariaLabel="Toggle between light and dark mode"
          onClick={() => {
            userStore.saveUI({ mode: props.user.ui.mode === 'light' ? 'dark' : 'light' })
          }}
        >
          <Show when={props.user.ui.mode === 'dark'} fallback={<Sun />}>
            <Moon aria-hidden="true" />
          </Show>
        </Item>

        <Item
          onClick={() => {
            if (props.showMenu) settingStore.closeMenu()
            toastStore.modal(true)
          }}
          ariaLabel="Show notification list"
        >
          <Switch>
            <Match when={count() > 0}>
              <div
                class="relative flex"
                role="status"
                aria-label={`Status: You have ${count()} new notifications`}
              >
                <Bell fill="var(--bg-100)" aria-hidden="true" />
                <span class="absolute bottom-[-0.5rem] right-[-0.5rem]" aria-hidden="true">
                  <Badge type="rose">{count() > 9 ? '9+' : count()}</Badge>
                </span>
              </div>
            </Match>

            <Match when={!count()}>
              <Bell color="var(--bg-500)" role="status" aria-label="Status: No new notifications" />
            </Match>
          </Switch>
        </Item>
      </div>
      <div class="flex flex-wrap justify-center gap-[2px] text-sm">
        <Show when={props.patreon}>
          <ExternalLink href="https://patreon.com/Agnaistic" newtab ariaLabel="Patreon">
            <HeartHandshake aria-hidden="true" />
          </ExternalLink>
        </Show>

        <ExternalLink href="https://discord.agnai.chat" newtab ariaLabel="Discord">
          <Show when={props.mode === 'dark'}>
            <DiscordLightIcon />
          </Show>
          <Show when={props.mode === 'light'}>
            <DiscordDarkIcon />
          </Show>
        </ExternalLink>

        <Item
          onClick={() => {
            clearTours()
            window.location.href = location.origin
          }}
        >
          <Tooltip tip="Show Welcome Tours" position="top">
            <Info />
          </Tooltip>
        </Item>
      </div>
    </>
  )
}

function onItemClick(onClick?: () => void, menuOpen?: boolean) {
  return () => {
    onClick?.()

    if (menuOpen) return

    const { showMenu } = settingStore.getState()
    if (showMenu) settingStore.closeMenu()
  }
}

const Item: Component<{
  href?: string
  ariaLabel?: string
  children: string | JSX.Element
  class?: string
  onClick?: () => void
  tooltip?: string
  menuOpen?: boolean
  tipClass?: string
}> = (props) => {
  return (
    <Tooltip
      position="top"
      tip={props.tooltip}
      class="flex items-center"
      classList={{ 'min-h-[2.25rem]': !props.class?.includes('h-') }}
    >
      <Show when={!props.href}>
        <div
          class={`flex h-full cursor-pointer items-center justify-start gap-4 rounded-lg px-2 hover:bg-[var(--bg-700)] ${
            props.class || ''
          }`}
          classList={{
            'gap-4': !props.class?.includes('gap-'),
            'min-h-[2.25rem]': !props.class?.includes('h-'),
          }}
          onClick={onItemClick(props.onClick, props.menuOpen)}
          tabindex={0}
          role="button"
          aria-label={props.ariaLabel}
        >
          {props.children}
        </div>
      </Show>
      <Show when={props.href}>
        <A
          href={props.href!}
          class={`flex h-full items-center justify-start gap-4 rounded-lg px-2 hover:bg-[var(--bg-700)] ${
            props.class || ''
          }`}
          classList={{
            'min-h-[2.25rem]': !props.class?.includes('h-'),
          }}
          onClick={onItemClick(props.onClick, props.menuOpen)}
          role="button"
          aria-label={props.ariaLabel}
        >
          {props.children}
        </A>
      </Show>
    </Tooltip>
  )
}

const SubMenu: Component<{ children: any }> = (props) => <div class="bg-900">{props.children}</div>

const SubItem: Component<{
  parent: string
  href: string
  ariaLabel?: string
  children: string | JSX.Element
  onClick?: () => void
}> = (props) => {
  const loc = useLocation()
  return (
    <Show when={loc.pathname.startsWith(props.parent)}>
      <A
        activeClass="bg-[var(--hl-900)]"
        href={props.href!}
        class="flex min-h-[2.5rem] items-center justify-start gap-4 rounded-lg px-2 pl-4 hover:bg-[var(--bg-700)] sm:min-h-[2.5rem]"
        onClick={() => {
          if (settingStore.getState().showMenu) settingStore.closeMenu()
        }}
        role="button"
        aria-label={props.ariaLabel}
      >
        <ChevronRight aria-hidden="true" size={14} />
        <span aria-hidden="true">{props.children}</span>
      </A>
    </Show>
  )
}

export default Navigation

const ExternalLink: Component<{
  href: string
  newtab?: boolean
  ariaLabel?: string
  children?: any
}> = (props) => (
  <a
    class="flex h-10 items-center justify-start gap-4 rounded-xl px-2 hover:bg-[var(--bg-700)] sm:h-12"
    href={props.href}
    target={props.newtab ? '_blank' : ''}
    role="link"
    aria-label={props.ariaLabel}
  >
    {props.children}
  </a>
)

const Library: Component<{}> = (props) => {
  return (
    <div class="grid w-full gap-2" style={{ 'grid-template-columns': '1fr 30px' }}>
      <Item
        href="/memory"
        ariaLabel="Library"
        onClick={() => soundEmitter.emit('menu-item-clicked', 'library')}
      >
        <Book aria-hidden="true" />
        <span aria-hidden="true"> Library </span>
      </Item>
    </div>
  )
}

const Sounds: Component<{}> = (props) => {
  const audioSettings = audioStore()

  return (
    <MultiItem>
      <Item href="/sounds" onClick={() => soundEmitter.emit('menu-item-clicked', 'sounds')}>
        <Speaker /> Sounds
      </Item>
      <EndItem>
        <a class="icon-button" onClick={() => audioStore.toggleMuteTrack('master')}>
          <Show when={audioSettings.tracks.master.muted}>
            <VolumeX />
          </Show>
          <Show when={!audioSettings.tracks.master.muted}>
            <Volume2 />
          </Show>
        </a>
      </EndItem>
    </MultiItem>
  )
}

const CharacterLink = () => {
  return (
    <MultiItem>
      <Item
        href="/character/list"
        ariaLabel="Characters"
        onClick={() => soundEmitter.emit('menu-item-clicked', 'characters')}
        class="tour-character"
      >
        <WizardIcon aria-hidden="true" />
        <span aria-hidden="true"> Characters </span>
      </Item>
      <EndItem>
        <A class="icon-button" href="/editor" role="button" aria-label="Add a new character">
          <Plus aria-hidden="true" />
        </A>
      </EndItem>
    </MultiItem>
  )
}

const ChatLink = () => {
  return (
    <MultiItem>
      <Item
        href="/chats"
        ariaLabel="Chats"
        onClick={() => soundEmitter.emit('menu-item-clicked', 'chats')}
      >
        <MessageCircle fill="var(--bg-100)" aria-hidden="true" />
        <span aria-hidden="true"> Chats </span>
      </Item>
      <EndItem>
        <A class="icon-button" href="/chats/create" role="button" aria-label="Create a new chat">
          <Plus aria-hidden="true" />
        </A>
      </EndItem>
    </MultiItem>
  )
}

export const UserProfile = () => {
  const chars = characterStore()
  const user = userStore()
  const menu = settingStore()

  return (
    <>
      <div
        class="tour-user-profile grid w-full items-center justify-between gap-2"
        style={{
          'grid-template-columns': '1fr max-content',
        }}
      >
        <Item
          ariaLabel="Edit user profile"
          onClick={() => {
            if (menu.showMenu) settingStore.closeMenu()
            soundEmitter.emit('menu-item-clicked', 'profile')
            userStore.modal(true)
          }}
        >
          <Switch>
            <Match when={chars.impersonating}>
              <CharacterAvatar
                char={chars.impersonating!}
                format={{ corners: 'circle', size: 'xs' }}
              />
            </Match>

            <Match when>
              <AvatarIcon
                avatarUrl={chars.impersonating?.avatar || user.profile?.avatar}
                format={{ corners: 'circle', size: 'xs' }}
              />
            </Match>
          </Switch>
          <span aria-hidden="true">{chars.impersonating?.name || user.profile?.handle}</span>
        </Item>
        <div class="flex items-center">
          <Button
            class="text-600 text-xs"
            schema="secondary"
            size="sm"
            aria-label="Open impersonation menu"
            onClick={() => {
              settingStore.toggleImpersonate(true)
              if (menu.showMenu) settingStore.closeMenu()
            }}
          >
            Persona
            {/* <VenetianMask aria-hidden="true" /> */}
          </Button>
        </div>
      </div>
    </>
  )
}

const MultiItem: Component<{ children: any }> = (props) => {
  return (
    <div class="grid w-full gap-2" style={{ 'grid-template-columns': '1fr 30px' }}>
      {props.children}
    </div>
  )
}

const DoubleItem: Component<{ children: any; class?: string }> = (props) => {
  return (
    <div
      class={`grid w-full gap-2 ${props.class || ''}`}
      style={{ 'grid-template-columns': '1fr 1fr' }}
    >
      {props.children}
    </div>
  )
}

const EndItem: Component<{ children: any }> = (props) => {
  return <div class="flex items-center">{props.children}</div>
}

const Slots: Component = (props) => {
  const [ref, onRef] = useRef()
  const state = settingStore()
  const { load } = useResizeObserver()

  createEffect(() => {
    const ele = ref()
    if (ele) load(ele)
  })

  const [rendered, setRendered] = createSignal(false)

  createEffect(() => {
    if (rendered()) return

    if (state.showMenu) {
      setTimeout(() => setRendered(true), 500)
    }
  })

  return (
    <div ref={onRef} class="h-full w-full">
      <Slot parent={ref()} slot="menu" />
    </div>
  )
}

export const Nav = {
  Item,
  MultiItem,
  SubItem,
  DoubleItem,
}

export const SubCTA: Component<{
  width?: 'fit' | 'full'
  children?: any
  onClick?: () => void
}> = (props) => {
  const settings = settingStore()
  const [, setSearch] = useSearchParams()

  const openSubPage = () => {
    setSearch({ profile_tab: 'subscription' })
    userStore.modal(true)
    props.onClick?.()
  }

  return (
    <Show when={settings.config.patreon}>
      <CallToAction theme="hl" targets={['guests', 'users']} width={props.width || 'fit'}>
        <div class="flex cursor-pointer justify-center text-center text-sm" onClick={openSubPage}>
          <Show when={props.children} fallback={<>Subscribe for higher quality chats and no ads</>}>
            {props.children}
          </Show>
        </div>
      </CallToAction>
    </Show>
  )
}
