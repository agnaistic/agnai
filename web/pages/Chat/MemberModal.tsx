import { ArchiveRestore, ArrowBigLeft, Crown, Eye, EyeOff, Mail, Plus, Trash } from 'lucide-solid'
import { Component, createMemo, createSignal, For, Match, onMount, Show, Switch } from 'solid-js'
import { AppSchema } from '../../../common/types/schema'
import AvatarIcon, { CharacterAvatar } from '../../shared/AvatarIcon'
import Button from '../../shared/Button'
import { ConfirmModal } from '../../shared/Modal'
import { characterStore, chatStore, toastStore, userStore } from '../../store'
import TextInput from '../../shared/TextInput'
import { v4 } from 'uuid'
import { isLoggedIn } from '/web/store/api'
import CharacterSelectList from '/web/shared/CharacterSelectList'
import { getActiveBots } from './util'
import Divider from '/web/shared/Divider'
import Convertible from '../../shared/Mode/Convertible'
import { CreateCharacterForm } from '../Character/CreateCharacterForm'
import Accordian from '/web/shared/Accordian'

type View = 'list' | 'invite_user' | 'add_character' | 'temp_character'

const MemberModal: Component<{
  show: boolean
  close: () => void
  charId: string
  chat: AppSchema.Chat
}> = (props) => {
  const [view, setView] = createSignal<View>('list')
  const [editCharId, setEditCharId] = createSignal<string>()
  const [footer, setFooter] = createSignal<any>()

  const Footer = (
    <>
      <Show when={view() === 'list'}>
        <Button
          schema="primary"
          onClick={() => {
            setEditCharId()
            setView('temp_character')
          }}
        >
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

  onMount(() => {
    setFooter(Footer)
  })

  const closeEditor = () => {
    setView('list')
    setFooter(Footer)
  }

  const paneClose = () => {
    if (view() === 'list') {
      props.close()
    } else {
      setView('list')
      setFooter(Footer)
    }
  }

  const editChar = (id: string) => {
    setEditCharId(id)
    setView('temp_character')
  }

  return (
    <>
      <Convertible title="Participants" close={paneClose} footer={footer()}>
        <div class="space-y-2 text-sm">
          <Switch>
            <Match when={view() === 'list'}>
              <ParticipantsList setView={setView} charId={props.charId} edit={editChar} />
            </Match>
            <Match when={view() === 'temp_character'}>
              <CreateCharacterForm
                editId={editCharId()}
                chat={props.chat}
                footer={setFooter}
                close={closeEditor}
                temp={editCharId()?.startsWith('temp') || !editCharId()}
                onSuccess={(char) => setEditCharId(char._id)}
              />
            </Match>
            <Match when={view() === 'add_character'}>
              <AddCharacter setView={setView} />
            </Match>
            <Match when={view() === 'invite_user'}>
              <InviteUser setView={setView} />
            </Match>
          </Switch>
        </div>
      </Convertible>
    </>
  )
}

const ParticipantsList: Component<{
  setView: (view: View) => {}
  charId: string
  edit: (charId: string) => void
}> = (props) => {
  const self = userStore()
  const chars = characterStore()
  const state = chatStore()

  const [deleting, setDeleting] = createSignal<AppSchema.Profile>()

  const charMembers = createMemo<AppSchema.Character[]>(() => {
    const active = getActiveBots(
      state.active?.chat!,
      chars.characters.map,
      state.active?.chat.tempCharacters || {}
    )

    const needsImpersonate =
      chars.impersonating && active.every((a) => a._id !== chars.impersonating?._id)
    if (needsImpersonate) {
      active.unshift(chars.impersonating!)
    }

    active.sort((left, right) => left.name.localeCompare(right.name))

    return active
  })

  const temps = createMemo(() => {
    const chat = state.active?.chat
    if (!chat) return { active: [], inactive: [], deleted: [] }

    if (!chat.tempCharacters) return { active: [], inactive: [], deleted: [] }

    const all = Object.values(chat.tempCharacters)
    const active = all.filter((char) => char.favorite !== false && !char.deletedAt)
    const inactive = all.filter((char) => char.favorite === false && !char.deletedAt)
    const deleted = all.filter((ch) => !!ch.deletedAt)

    return { active, inactive, deleted }
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
            edit={props.edit}
          />
        )}
      </For>

      <Show when={temps().active.length > 0 || temps().inactive.length > 0}>
        <Divider />
        <h3>Temporary Characters</h3>
      </Show>

      <For each={temps().active}>
        {(char) => (
          <CharacterParticipant
            chat={state.active?.chat}
            char={char}
            remove={removeChar}
            canRemove={props.charId !== char._id}
            isMain={props.charId === char._id}
            edit={props.edit}
          />
        )}
      </For>

      <Show when={temps().active.length > 0 || temps().inactive.length > 0}>
        <Divider />
      </Show>

      <For each={temps().inactive}>
        {(char) => (
          <CharacterParticipant
            chat={state.active?.chat}
            char={char}
            remove={removeChar}
            canRemove={props.charId !== char._id}
            isMain={props.charId === char._id}
            edit={props.edit}
          />
        )}
      </For>

      <Show when={temps().deleted.length > 0}>
        <Accordian
          open={false}
          title={<span class="text-600">Deleted Temporary Characters</span>}
          class="bg-800"
        >
          <For each={temps().deleted}>
            {(char) => (
              <CharacterParticipant
                chat={state.active?.chat}
                char={char}
                remove={removeChar}
                canRemove={false}
                isMain={props.charId === char._id}
                edit={props.edit}
              />
            )}
          </For>
        </Accordian>
      </Show>

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

  const [userId, setUserId] = createSignal('')

  const invite = () => {
    if (!state.active?.chat) return
    const chatId = state.active.chat._id

    if (!userId()) {
      toastStore.warn('No user ID provided')
      return
    }
    return chatStore.inviteUser(chatId, userId(), () => props.setView('list'))
  }

  return (
    <>
      <form ref={ref} class="flex w-full max-w-full flex-col gap-2">
        <TextInput
          class="text-sm"
          label="Invite User"
          helperText="The ID of the user to invite. The user should provide this to you"
          placeholder={`E.g. ${v4()}`}
          onChange={(ev) => setUserId(ev.currentTarget.value)}
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
  chat?: AppSchema.Chat
  edit?: (charId: string) => void
}> = (props) => {
  const isTemp = createMemo(() => props.char._id.startsWith('temp-'))

  const toggleTempChar = (state: boolean) => {
    if (!props.chat) return
    chatStore.upsertTempCharacter(props.chat._id, { ...props.char, favorite: state })
  }

  const deleteTempChar = () => {
    if (!props.chat) return
    chatStore.upsertTempCharacter(props.chat._id, {
      ...props.char,
      deletedAt: new Date().toISOString(),
    })
  }

  const restoreTempChar = () => {
    if (!props.chat) return
    chatStore.upsertTempCharacter(props.chat._id, {
      ...props.char,
      deletedAt: '',
    })
  }

  return (
    <div class="bg-800 flex items-center justify-between gap-2 rounded-md p-1">
      <div
        class="ellipsis flex w-full items-center gap-2"
        classList={{
          'cursor-pointer': !!props.edit,
        }}
        onClick={() => props.edit?.(props.char._id)}
      >
        <CharacterAvatar format={{ corners: 'circle', size: 'sm' }} char={props.char} openable />
        <div class="ellipsis flex flex-col">
          <div class="ellipsis" classList={{ 'text-600': !!props.char.deletedAt }}>
            {props.char.name}
          </div>
          <div class="text-xs italic text-[var(--text-600)]">
            {props.isMain
              ? 'Main Character'
              : props.char._id.startsWith('temp-')
              ? 'Temporary Character'
              : 'Character'}
          </div>
        </div>
      </div>

      <Show when={!isTemp()}>
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
      </Show>

      <Show when={props.chat && isTemp()}>
        <div class="flex gap-2">
          <Show when={!props.char.deletedAt && props.char.favorite !== false}>
            <Button schema="clear" class="px-2" size="sm" onClick={() => toggleTempChar(false)}>
              <Eye size={16} />
            </Button>
          </Show>

          <Show when={!props.char.deletedAt && props.char.favorite === false}>
            <Button schema="clear" class="px-2" size="sm" onClick={() => toggleTempChar(true)}>
              <EyeOff size={16} color="var(--bg-500)" />
            </Button>
          </Show>

          <Show when={!props.char.deletedAt}>
            <Button schema="clear" class="px-2" size="sm" onClick={() => deleteTempChar()}>
              <Trash size={16} />
            </Button>
          </Show>

          <Show when={!!props.char.deletedAt}>
            <Button schema="clear" class="px-2" size="sm" onClick={() => restoreTempChar()}>
              <ArchiveRestore size={16} />
            </Button>
          </Show>
        </div>
      </Show>
    </div>
  )
}

export default MemberModal
