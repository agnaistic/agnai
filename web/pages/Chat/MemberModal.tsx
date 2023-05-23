import { Trash } from 'lucide-solid'
import { Component, createMemo, createSignal, For, Match, onMount, Show, Switch } from 'solid-js'
import { AppSchema } from '../../../srv/db/schema'
import AvatarIcon from '../../shared/AvatarIcon'
import Button from '../../shared/Button'
import Modal, { ConfirmModal } from '../../shared/Modal'
import { characterStore, chatStore, toastStore, userStore } from '../../store'
import Divider from '../../shared/Divider'
import TextInput from '../../shared/TextInput'
import { v4 } from 'uuid'
import { getStrictForm } from '../../shared/util'
import Select, { Option } from '/web/shared/Select'
import CharacterSelect from '/web/shared/CharacterSelect'
import { isLoggedIn } from '/web/store/api'

type InviteType = 'user' | 'character'

const MemberModal: Component<{ show: boolean; close: () => void; charId: string }> = (props) => {
  let ref: any
  const self = userStore()
  const state = chatStore()
  const chars = characterStore()

  const typeItems: Option<InviteType>[] = [{ value: 'character', label: 'Character' }]

  if (isLoggedIn()) {
    typeItems.unshift({ value: 'user', label: 'User' })
  }

  onMount(() => {
    if (!chars.characters.loaded) {
      characterStore.getCharacters()
    }
  })

  const [deleting, setDeleting] = createSignal<AppSchema.Profile>()
  const [type, setType] = createSignal(typeItems[0].value)
  const [inviteChar, setInviteChar] = createSignal<AppSchema.Character>()

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

  const characters = createMemo(() => {
    const available = chars.characters.list.filter(
      (c) => c._id !== props.charId && !charMemberIds().includes(c._id)
    )
    if (available.length) setInviteChar(available[0])
    return available
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

  const invite = () => {
    if (!state.active?.chat) return
    const chatId = state.active.chat._id

    switch (type()) {
      case 'user':
        const body = getStrictForm(ref, { userId: 'string' })
        return chatStore.inviteUser(chatId, body.userId, props.close)

      case 'character':
        const char = inviteChar()
        if (!char) {
          toastStore.error('No character selected')
          return
        }
        return chatStore.addCharacter(chatId, char._id, props.close)
    }
  }

  const removeChar = (charId: string) => {
    if (!state.active?.chat) return
    chatStore.removeCharacter(state.active.chat._id, charId)
  }

  const Footer = (
    <>
      <Button schema="secondary" onClick={props.close}>
        Close
      </Button>
    </>
  )
  return (
    <>
      <Modal show={props.show} close={props.close} title="Participants" footer={Footer}>
        <form ref={ref} class="flex w-full max-w-full flex-col gap-2">
          <Select
            fieldName="type"
            label="Invitation Type"
            helperText="Whether to invite a user or a character"
            items={typeItems}
            value={typeItems[0].value}
            onChange={(val) => setType(val.value as any)}
          />

          <div class="flex max-w-full flex-col gap-2">
            <Switch>
              <Match when={type() === 'user'}>
                <TextInput
                  class="text-sm"
                  fieldName="userId"
                  label="Invite User"
                  helperText="The ID of the user to invite. The user should provide this to you"
                  placeholder={`E.g. ${v4()}`}
                />
              </Match>

              <Match when={type() === 'character'}>
                <Show
                  when={characters().length}
                  fallback={
                    <div class="text-red-500">You don't have any other characters to invite</div>
                  }
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
              </Match>
            </Switch>

            <Button class="h-[36px]" onClick={invite}>
              Invite
            </Button>
          </div>
        </form>
        <Divider />
        <div class="space-y-2 text-sm">
          <For each={users()}>
            {(member) => (
              <Participant
                member={member}
                remove={setDeleting}
                canRemove={isOwner() && member._id !== self.profile?._id}
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
      </Modal>

      <ConfirmModal
        show={!!deleting()}
        close={() => setDeleting()}
        confirm={remove}
        message={`Are you sure you wish to remove "${deleting()?.handle}"?`}
      />
    </>
  )
}

export default MemberModal

const Participant: Component<{
  member: AppSchema.Profile
  remove: (profile: AppSchema.Profile) => void
  canRemove: boolean
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
      <Show when={props.canRemove}>
        <Button schema="clear" onClick={() => props.remove(props.char._id)}>
          <Trash size={16} />
        </Button>
      </Show>
    </div>
  )
}
