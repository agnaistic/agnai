import { ArrowBigLeft, Bot, Crown, Mail, Plus, Trash, User } from 'lucide-solid'
import { Component, createMemo, createSignal, For, Match, onMount, Show, Switch } from 'solid-js'
import { AppSchema } from '../../../srv/db/schema'
import AvatarIcon from '../../shared/AvatarIcon'
import Button from '../../shared/Button'
import Modal, { ConfirmModal } from '../../shared/Modal'
import { characterStore, chatStore, toastStore, userStore } from '../../store'
import TextInput from '../../shared/TextInput'
import { v4 } from 'uuid'
import { getStrictForm } from '../../shared/util'
import CharacterSelect from '/web/shared/CharacterSelect'
import { isLoggedIn } from '/web/store/api'

type View = 'list' | 'invite_user' | 'invite_character'

const MemberModal: Component<{ show: boolean; close: () => void; charId: string }> = (props) => {
  const [view, setView] = createSignal<View>('list')

  const Footer = (
    <>
      <Show when={view() === 'list'}>
        <Button schema="secondary" onClick={props.close}>
          Close
        </Button>
        <Button schema="primary" onClick={() => setView('invite_character')}>
          <Bot size={16} /> Add Character
        </Button>
        <Show when={isLoggedIn()}>
          <Button schema="primary" onClick={() => setView('invite_user')}>
            <User size={16} /> Add User
          </Button>
        </Show>
      </Show>
      <Show when={view() !== 'list'}>
        <Button schema="secondary" onClick={() => setView('list')}>
          <ArrowBigLeft size={16} /> Back
        </Button>
      </Show>
    </>
  )
  return (
    <>
      <Modal show={props.show} close={props.close} title="Participants" footer={Footer}>
        <Switch>
          <Match when={view() === 'list'}>
            <ParticipantsList setView={setView} charId={props.charId} />
          </Match>
          <Match when={view() === 'invite_character'}>
            <InviteCharacter setView={setView} />
          </Match>
          <Match when={view() === 'invite_user'}>
            <InviteUser setView={setView} />
          </Match>
        </Switch>
      </Modal>
    </>
  )
}

const ParticipantsList: Component<{ setView: (view: View) => {}; charId: string }> = (props) => {
  const self = userStore()
  const state = chatStore()

  const [deleting, setDeleting] = createSignal<AppSchema.Profile>()

  const charMemberIds = createMemo(() => {
    if (!state.active?.char) return []
    const active = Object.entries(state.active.chat.characters || {})
      .filter((pair) => pair[1])
      .map((pair) => pair[0])
    return [state.active.char._id, ...active]
  })

  const charMembers = createMemo(() => {
    return state.chatBots.filter((bot) => charMemberIds().includes(bot._id))
  })

  const isOwner = createMemo(() => self.user?._id === state.active?.chat.userId)

  const remove = () => {
    const member = deleting()
    if (!member) return
    if (!state.active?.chat) return
    chatStore.uninviteUser(state.active?.chat._id, member.userId)
  }

  const users = createMemo(() => {
    if (!self.profile) return []
    const participants = state.active?.participantIds?.map((id) => state.memberIds[id]) || []
    return [self.profile].concat(participants)
  })

  const removeChar = (charId: string) => {
    if (!state.active?.chat) return
    chatStore.removeCharacter(state.active.chat._id, charId)
  }

  return (
    <>
      <div class="space-y-2 text-sm">
        <For each={users()}>
          {(member) => (
            <UserParticipant
              member={member}
              remove={setDeleting}
              canRemove={isOwner() && member._id !== self.profile?._id}
              isOwner={isOwner()}
            />
          )}
        </For>
        <For each={charMembers()}>
          {(char) => (
            <CharacterParticipant
              char={char}
              remove={removeChar}
              canRemove={props.charId !== char._id}
            />
          )}
        </For>
      </div>

      <ConfirmModal
        show={!!deleting()}
        close={() => setDeleting()}
        confirm={remove}
        message={`Are you sure you wish to remove "${deleting()?.handle}"?`}
      />
    </>
  )
}

const InviteCharacter: Component<{ setView: (view: View) => {} }> = (props) => {
  const state = chatStore()
  const chars = characterStore()

  onMount(() => {
    if (!chars.characters.loaded) {
      characterStore.getCharacters()
    }
  })

  const [inviteChar, setInviteChar] = createSignal<AppSchema.Character>()

  const charMemberIds = createMemo(() => {
    if (!state.active?.char) return []
    const active = Object.entries(state.active.chat.characters || {})
      .filter((pair) => pair[1])
      .map((pair) => pair[0])
    return [state.active.char._id, ...active]
  })

  const characters = createMemo(() => {
    const available = chars.characters.list.filter((c) => !charMemberIds().includes(c._id))
    if (available.length) setInviteChar(available[0])
    return available
  })

  const invite = () => {
    if (!state.active?.chat) return
    const chatId = state.active.chat._id

    const char = inviteChar()
    if (!char) {
      toastStore.error('No character selected')
      return
    }
    return chatStore.addCharacter(chatId, char._id)
  }

  return (
    <>
      <Show
        when={characters().length}
        fallback={<div class="text-red-500">You don't have any other characters to invite</div>}
      >
        <CharacterSelect
          class="w-full"
          fieldName="character"
          label="Character"
          helperText="The character to invite"
          items={characters()}
          value={inviteChar()}
          onChange={(val) => setInviteChar(val)}
        />
      </Show>

      <div class="mt-4">
        <Button class="h-[36px] w-full" onClick={invite}>
          <Plus /> Add Character
        </Button>
      </div>
    </>
  )
}

const InviteUser: Component<{ setView: (view: View) => {} }> = (props) => {
  let ref: any
  const state = chatStore()

  const invite = () => {
    if (!state.active?.chat) return
    const chatId = state.active.chat._id
    const body = getStrictForm(ref, { userId: 'string' })
    if (body.userId) {
      toastStore.warn('No user ID provided')
      return
    }
    return chatStore.inviteUser(chatId, body.userId, () => props.setView('list'))
  }

  return (
    <>
      <form ref={ref} class="flex w-full max-w-full flex-col gap-2">
        <TextInput
          class="text-sm"
          fieldName="userId"
          label="Invite User"
          helperText="The ID of the user to invite. The user should provide this to you"
          placeholder={`E.g. ${v4()}`}
        />

        <div class="mt-4">
          <Button class="h-[36px] w-full" onClick={invite}>
            <Mail />
            Send Invite
          </Button>
        </div>
      </form>
    </>
  )
}

const UserParticipant: Component<{
  member: AppSchema.Profile
  remove: (profile: AppSchema.Profile) => void
  canRemove: boolean
  isOwner: boolean
}> = (props) => {
  return (
    <div class="flex items-center justify-between gap-2 rounded-md bg-[var(--bg-800)] p-1">
      <div class="flex items-center gap-2">
        <AvatarIcon
          avatarUrl={props.member.avatar}
          format={{ size: 'sm', corners: 'circle' }}
          openable
        />
        <div class="ellipsis flex flex-col">
          <div class="ellipsis">{props.member.handle}</div>
          <div class="text-xs italic text-[var(--text-600)]">{props.member.userId.slice(0, 8)}</div>
        </div>
      </div>
      <div class="flex">
        <Show when={props.isOwner}>
          <Button schema="clear" onClick={() => {}} disabled>
            <Crown size={16} class="opacity-50" />
          </Button>
        </Show>
        <Show when={props.canRemove}>
          <Button schema="clear" onClick={() => props.remove(props.member)}>
            <Trash size={16} />
          </Button>
        </Show>
      </div>
    </div>
  )
}

const CharacterParticipant: Component<{
  char: AppSchema.Character
  canRemove: boolean
  remove: (charId: string) => void
}> = (props) => {
  return (
    <div class="flex items-center justify-between gap-2 rounded-md bg-[var(--bg-800)] p-1">
      <div class="ellipsis flex items-center gap-2">
        <AvatarIcon
          format={{ corners: 'circle', size: 'sm' }}
          avatarUrl={props.char.avatar}
          openable
        />
        <div class="ellipsis">{props.char.name}</div>
      </div>
      <Show when={!props.canRemove}>
        <Button schema="clear" onClick={() => {}} disabled>
          <Trash size={16} class="opacity-50" />
        </Button>
      </Show>
      <Show when={props.canRemove}>
        <Button schema="clear" onClick={() => props.remove(props.char._id)}>
          <Trash size={16} />
        </Button>
      </Show>
    </div>
  )
}

export default MemberModal
