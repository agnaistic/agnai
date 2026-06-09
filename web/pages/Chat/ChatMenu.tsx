import './chat-detail.css'
import { Component, createMemo, JSX, Show } from 'solid-js'
import { ChatRightPane, chatStore, imageStore, pageStore } from '../../store'
import { ChatModal } from './ChatOptions'
import { usePaneManager } from '/web/shared/hooks'
import { ContextState } from '/web/store/context'
import { useSubNav } from '/web/subnav'
import { Nav, NotificationBell, UserProfile } from '/web/Navigation'
import {
  Book,
  Palette,
  Settings,
  Sliders,
  Users,
  Map,
  Download,
  Trash,
  RotateCcw,
  ChevronLeft,
  Pencil,
  ImagePlus,
} from 'lucide-solid'
import { ThirdPartyModel } from '/web/shared/PresetSettings/ThirdPartyModel'
import { PresetProvider } from '../Settings/Provider'
import { createEmitter } from '/web/shared/util'
import { usePresetContext } from '/web/store/preset-context'
import { getStore } from '/web/store/create'

type NavProps = {
  ctx: ContextState
  togglePane: (paneType: ChatRightPane) => void
  setModal: (model: ChatModal) => void
  adapterLabel: string | JSX.Element
}

export const ChatMenu: Component<{
  ctx: ContextState
  isOwner: boolean
}> = (props) => {
  const pane = usePaneManager()
  const [preset, _setters] = usePresetContext()

  const togglePane = (paneType: ChatRightPane) => {
    chatStore.option({ options: false })
    pane.update(paneType)
  }

  const setModal = (modal: ChatModal) => {
    chatStore.option({ options: false, modal })
  }

  const adapterLabel = createMemo(() => {
    if (!preset.current._id) return `None`

    const suffix = preset.current.name

    return suffix || 'Unnamed Preset'
  })

  useSubNav({
    // title: 'Chat Options',
    header: (
      <ChatMenuTitle ctx={props.ctx} togglePane={togglePane} setModal={setModal} adapterLabel="" />
    ),
    body: (
      <ChatNav
        ctx={props.ctx}
        togglePane={togglePane}
        setModal={setModal}
        adapterLabel={adapterLabel()}
      />
    ),
  })

  return null
}

const ChatNav: Component<NavProps> = (props) => {
  const [preset, setters] = usePresetContext()
  const isOwner = createMemo(
    () => props.ctx.chat?.userId === props.ctx.user?._id && props.ctx.chat?.mode !== 'companion'
  )

  const size = 20

  const openProviders = createEmitter('open')

  const openMessageImages = () => {
    const last = getStore('messages').getState().msgs.slice(-1)[0]

    if (!last) {
      imageStore.openImageGen()
      return
    }

    imageStore.showMessageImages({ id: last._id, position: -1 })
  }

  return (
    <>
      <UserProfile />

      <Nav.DoubleItem>
        <Nav.Item class="min-h-8" href={`/character/list`}>
          <ChevronLeft size={16} /> Characters
        </Nav.Item>

        <Nav.Item
          class="min-h-8"
          href={`/character/${props.ctx.char?._id}/chats`}
          disabled={!props.ctx.char?._id}
        >
          <ChevronLeft size={16} /> Chats
        </Nav.Item>
      </Nav.DoubleItem>

      <Nav.Item onClick={() => props.togglePane('participants')}>
        <Users size={size} /> Participants
      </Nav.Item>

      <Nav.Item onClick={() => props.togglePane('chat-settings')}>
        <Settings size={size} /> Edit Chat
      </Nav.Item>

      <Nav.Item onClick={() => props.togglePane('preset')}>
        <Sliders class="min-w-[24px]" width={'24px'} size={size} />
        <span class="min-w-fit">Preset </span>
        <span class="text-500 ellipsis text-xs italic">{props.adapterLabel}</span>
      </Nav.Item>

      <Show when={isOwner()}>
        <Nav.Item onClick={() => props.togglePane('memory')}>
          <Book size={size} /> Memory
        </Nav.Item>
      </Show>

      <Nav.Item onClick={() => props.togglePane('ui')} class="tour-ui">
        <Palette size={size} /> UI
      </Nav.Item>

      <Show when={isOwner()}>
        <Nav.Item onClick={() => props.setModal('graph')} class="tour-chat-graph">
          <Map size={size} /> Chat Graph
        </Nav.Item>
      </Show>

      <div class="flex flex-col gap-1">
        <PresetProvider
          state={preset.current}
          setters={setters}
          page="menu"
          openSub={openProviders.on}
        ></PresetProvider>
        <ThirdPartyModel state={preset.current} setters={setters} page="mode" />
      </div>

      <div class="flex flex-wrap justify-center gap-1 text-sm">
        <Nav.Item
          onClick={() => pageStore.settings(true)}
          ariaLabel="Open settings page"
          tooltip="Site Settings"
        >
          <Settings size={size} aria-hidden="true" />
        </Nav.Item>
        <Nav.Item
          onClick={openMessageImages}
          ariaLabel="Image Generation"
          tooltip="Image Generation"
        >
          <ImagePlus size={size} aria-hidden="true" />
        </Nav.Item>
        {/*<Nav.Item
          onClick={() => imageStore.imageSettings(true)}
          ariaLabel="Image Settings"
          tooltip="Image Settings"
        >
          <Image size={size} aria-hidden="true" />
        </Nav.Item>*/}
        <Nav.Item onClick={() => props.setModal('export')} tooltip="Download Chat">
          <Download size={size} />
        </Nav.Item>
        <Nav.Item onClick={() => props.setModal('restart')} tooltip="Restart Chat">
          <RotateCcw size={size} />
        </Nav.Item>
        <Nav.Item onClick={() => props.setModal('delete')} tooltip="Delete Chat">
          <Trash size={size} />
        </Nav.Item>

        <NotificationBell size={size} />
      </div>
    </>
  )
}
const ChatMenuTitle: Component<NavProps> = (props) => {
  return (
    <div
      onClick={() => props.togglePane('character')}
      class="bg-700 hover:bg-600 tour-edit-char flex h-8 max-w-[80%] cursor-pointer items-center gap-2 rounded-md px-2"
    >
      <Pencil size={16} color="var(--bg-500)" class="min-h-[12px] min-w-[12px]" />
      <span class="ellipsis text-md">{props.ctx.char?.name}</span>
    </div>
  )
}
