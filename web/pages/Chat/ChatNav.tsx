import { Component, createMemo, Show } from 'solid-js'
import { ContextState } from '/web/store/context'
import { CharacterAvatar } from '/web/shared/AvatarIcon'
import { Nav, UserProfile } from '/web/Navigation'
import { ChatRightPane, settingStore } from '/web/store'
import {
  Book,
  Palette,
  Settings,
  Sliders,
  Users,
  Map,
  Download,
  VenetianMask,
  Trash,
  RotateCcw,
} from 'lucide-solid'
import { ChatModal } from './ChatOptions'

type NavProps = {
  ctx: ContextState
  togglePane: (paneType: ChatRightPane) => void
  setModal: (model: ChatModal) => void
  adapterLabel: string
}

export const ChatNav: Component<NavProps> = (props) => {
  const isOwner = createMemo(
    () => props.ctx.chat?.userId === props.ctx.user?._id && props.ctx.chat?.mode !== 'companion'
  )

  return (
    <>
      <UserProfile />
      {/* <Nav.Item onClick={() => props.togglePane('character')}>
        <CharacterAvatar char={props.ctx.char!} format={{ corners: 'circle', size: 'xs' }} />
        <div>{props.ctx.char?.name}</div>
      </Nav.Item> */}

      <Nav.Item onClick={() => props.togglePane('participants')}>
        <Users /> Participants
      </Nav.Item>

      <Nav.Item onClick={() => props.togglePane('chat-settings')}>
        <Settings /> Edit Chat
      </Nav.Item>

      <Nav.Item onClick={() => props.togglePane('preset')}>
        <Sliders class="min-w-[24px]" width={'24px'} size={24} />
        <span class="min-w-fit">Preset </span>
        <span class="text-500 ellipsis text-xs italic">{props.adapterLabel}</span>
      </Nav.Item>

      <Show when={isOwner()}>
        <Nav.Item onClick={() => props.togglePane('memory')}>
          <Book /> Memory
        </Nav.Item>
      </Show>

      <Nav.Item onClick={() => props.togglePane('ui')}>
        <Palette /> UI
      </Nav.Item>

      <Show when={isOwner()}>
        <Nav.Item onClick={() => props.setModal('graph')}>
          <Map /> Chat Graph
        </Nav.Item>
      </Show>

      <div class="flex flex-wrap justify-center gap-1 text-sm">
        <Nav.Item onClick={() => settingStore.toggleAnonymize()}>
          <VenetianMask />
        </Nav.Item>
        <Nav.Item onClick={() => props.setModal('export')}>
          <Download />
        </Nav.Item>
        <Nav.Item onClick={() => props.setModal('restart')}>
          <RotateCcw />
        </Nav.Item>
        <Nav.Item onClick={() => props.setModal('delete')}>
          <Trash />
        </Nav.Item>
      </div>
    </>
  )
}

export const ChatCharacter: Component<NavProps> = (props) => {
  return (
    <Nav.Item onClick={() => props.togglePane('character')} class="max-w-[80%]">
      <CharacterAvatar char={props.ctx.char!} format={{ corners: 'circle', size: 'xs' }} />
      <span class="ellipsis">{props.ctx.char?.name}</span>
    </Nav.Item>
  )
}
