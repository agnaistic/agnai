import { ArrowBigLeft, Crown, Mail, Plus, Trash } from 'lucide-solid'
import { Component, createMemo, createSignal, For, Match, onMount, Show, Switch } from 'solid-js'
import { AppSchema } from '../../../common/types/schema'
import AvatarIcon, { CharacterAvatar } from '../../shared/AvatarIcon'
import Button from '../../shared/Button'
import Modal, { ConfirmModal } from '../../shared/Modal'
import { characterStore, chatStore, toastStore, userStore } from '../../store'
import TextInput from '../../shared/TextInput'
import { v4 } from 'uuid'
import { getStrictForm } from '../../shared/util'
import { isLoggedIn } from '/web/store/api'
import CharacterSelectList from '/web/shared/CharacterSelectList'
import { getActiveBots } from './util'
import { FormLabel } from '/web/shared/FormLabel'
import PersonaAttributes, { getAttributeMap } from '/web/shared/PersonaAttributes'

type View = 'list' | 'invite_user' | 'add_character' | 'temp_character'

const MemberModal: Component<{ show: boolean; close: () => void; charId: string }> = (props) => {
  const [view, setView] = createSignal<View>('temp_character')

  const Footer = (
    <>
      <Show when={view() === 'list'}>
        <Button schema="primary" onClick={() => setView('temp_character')}>
          <Plus size={16} /> Temp Character
        </Button>
        <Button schema="primary" onClick={() => setView('add_character')}>
          <Plus size={16} /> Character
        </Button>
        <Show when={isLoggedIn()}>
          <Button schema="primary" onClick={() => setView('invite_user')}>
            <Plus size={16} /> User
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
      <Modal
        show={props.show}
        close={props.close}
        title="Participants"
        footer={Footer}
        maxWidth="half"
      >
        <div class="space-y-2 text-sm">
          <Switch>
            <Match when={view() === 'list'}>
              <ParticipantsList setView={setView} charId={props.charId} />
            </Match>
            <Match when={view() === 'temp_character'}>
              <TempCharacter setView={setView} />
            </Match>
            <Match when={view() === 'add_character'}>
              <AddCharacter setView={setView} />
            </Match>
            <Match when={view() === 'invite_user'}>
              <InviteUser setView={setView} />
            </Match>
          </Switch>
        </div>
      </Modal>
    </>
  )
}

const TempCharacter: Component<{ setView: (view: View) => void }> = (props) => {
  let ref: any
  const state = chatStore()

  const onSave = () => {
    const attributes = getAttributeMap(ref)
    const body = getStrictForm(ref, {
      name: 'string',
      description: 'string',
      appearance: 'string',
      sampleChat: 'string',
    })

    const char: AppSchema.BaseCharacter = {
      _id: '',
      name: body.name,
      description: body.description,
      appearance: body.appearance,
      sampleChat: body.sampleChat,
      greeting: '',
      scenario: '',
      avatar: '',
      persona: {
        kind: 'text',
        attributes,
      },
    }

    chatStore.addTempCharacter(state.active?.chat?._id!, char, () => {
      props.setView('list')
    })
  }

  return (
    <form ref={ref} class="flex flex-col gap-2">
      <FormLabel
        label="Temporary Character"
        helperText="Quickly create a character for this conversation only"
      />

      <TextInput fieldName="name" label="Name" />
      <TextInput
        isMultiline
        fieldName="description"
        label="Description"
        helperText="Optional - Used for character generation"
      />
      <TextInput
        isMultiline
        fieldName="appearance"
        label="Appearance"
        helperText="Optional - For generating an avatar"
      />
      <PersonaAttributes plainText schema="text" />
      <TextInput
        isMultiline
        fieldName="sampleChat"
        label="Example Dialogue"
        helperText="Example of how the character speaks"
      />
      <div class="flex justify-center">
        <Button onClick={onSave}>Create Character</Button>
      </div>
    </form>
  )
}

const ParticipantsList: Component<{ setView: (view: View) => {}; charId: string }> = (props) => {
  const self = userStore()
  const chars = characterStore((s) => s.characters)
  const state = chatStore()

  const [deleting, setDeleting] = createSignal<AppSchema.Profile>()

  const charMembers = createMemo<AppSchema.Character[]>(() =>
    getActiveBots(state.active?.chat!, chars.map).sort((left, right) =>
      left.name.localeCompare(right.name)
    )
  )

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
    return [self.profile].concat(participants.sort((a, b) => a.handle.localeCompare(b.handle)))
  })

  const removeChar = (charId: string) => {
    if (!state.active?.chat) return
    chatStore.removeCharacter(state.active.chat._id, charId)
  }

  return (
    <>
      <For each={users()}>
        {(member) => (
          <UserParticipant
            member={member}
            remove={setDeleting}
            canRemove={isOwner() && member._id !== self.profile?._id}
            isOwner={isOwner() && member._id === self.profile?._id}
          />
        )}
      </For>
      <For each={charMembers()}>
        {(char) => (
          <CharacterParticipant
            char={char}
            remove={removeChar}
            canRemove={props.charId !== char._id}
            isMain={props.charId === char._id}
          />
        )}
      </For>

      <ConfirmModal
        show={!!deleting()}
        close={() => setDeleting()}
        confirm={remove}
        message={`Are you sure you wish to remove "${deleting()?.handle}"?`}
      />
    </>
  )
}

const AddCharacter: Component<{ setView: (view: View) => {} }> = (props) => {
  const state = chatStore()
  const chars = characterStore()

  onMount(() => {
    if (!chars.characters.loaded) {
      characterStore.getCharacters()
    }
  })

  const characters = createMemo(() => {
    const characters = state.active?.chat.characters || {}
    const mainCharId = state.active?.char._id
    if (!mainCharId) return []
    const members = Array.from(
      new Set([
        mainCharId,
        ...Object.entries(characters)
          .filter((pair) => pair[1])
          .map((pair) => pair[0])
          .flat(),
      ])
    )
    return chars.characters.list.filter((c) => !members.includes(c._id))
  })

  const add = (char: AppSchema.Character | undefined) => {
    if (!state.active?.chat || !char) return
    const chatId = state.active.chat._id
    chatStore.addCharacter(chatId, char._id, () => props.setView('list'))
  }

  return (
    <>
      <Show
        when={characters().length}
        fallback={<div class="text-red-500">You don't have any other characters to invite</div>}
      >
        <p class="pb-1 text-sm text-[var(--text-700)]">Select a character to add to the chat</p>
        <Show
          when={!!characters().length}
          fallback={<p>You don't have any characters available to add</p>}
        >
          <CharacterSelectList items={characters()} onSelect={add} />
        </Show>
      </Show>
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
    if (!body.userId) {
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
    <div class="bg-800 flex items-center justify-between gap-2 rounded-md p-1">
      <div class="flex items-center gap-2">
        <AvatarIcon
          avatarUrl={props.member.avatar}
          format={{ size: 'sm', corners: 'circle' }}
          openable
        />
        <div class="ellipsis flex flex-col">
          <div class="ellipsis">{props.member.handle}</div>
          <div class="text-xs italic text-[var(--text-600)]">
            {props.isOwner ? 'Chat Owner' : 'User'} {props.member.userId.slice(0, 8)}
          </div>
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
  isMain: boolean
  remove: (charId: string) => void
}> = (props) => {
  return (
    <div class="bg-800 flex items-center justify-between gap-2 rounded-md p-1">
      <div class="ellipsis flex items-center gap-2">
        <CharacterAvatar format={{ corners: 'circle', size: 'sm' }} char={props.char} openable />
        <div class="ellipsis flex flex-col">
          <div class="ellipsis">{props.char.name}</div>
          <div class="text-xs italic text-[var(--text-600)]">
            {props.isMain ? 'Main Character' : 'Character'}
          </div>
        </div>
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
