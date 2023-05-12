import { Trash } from 'lucide-solid'
import { Component, createMemo, createSignal, For, Match, onMount, Show, Switch } from 'solid-js'
import { AppSchema } from '../../../srv/db/schema'
import AvatarIcon from '../../shared/AvatarIcon'
import Button from '../../shared/Button'
import Modal, { ConfirmModal } from '../../shared/Modal'
import { characterStore, chatStore, userStore } from '../../store'
import Divider from '../../shared/Divider'
import TextInput from '../../shared/TextInput'
import { v4 } from 'uuid'
import { getStrictForm } from '../../shared/util'
import Select, { Option } from '/web/shared/Select'

type InviteType = 'user' | 'character'

const MemberModal: Component<{ show: boolean; close: () => void; charId: string }> = (props) => {
  let ref: any
  const self = userStore()
  const state = chatStore()
  const chars = characterStore()

  const typeItems: Option<InviteType>[] = [
    { value: 'user', label: 'User' },
    { value: 'character', label: 'Character' },
  ]

  onMount(() => {
    if (!chars.characters.loaded) {
      characterStore.getCharacters()
    }
  })

  const [deleting, setDeleting] = createSignal<AppSchema.Profile>()
  const [type, setType] = createSignal('user')
  const [inviteChar, setInviteChar] = createSignal<AppSchema.Character>()

  const characters = createMemo(() => {
    const available = chars.characters.list.filter((c) => c._id !== props.charId)
    setInviteChar(available[0])
    return available
  })

  const charMembers = createMemo(() => state.active?.chat.characterIds || [])
  const isOwner = createMemo(() => self.user?._id === state.active?.chat.userId)

  const remove = () => {
    const member = deleting()
    if (!member) return
    if (!state.active?.chat) return
    chatStore.uninviteUser(state.active?.chat._id, member.userId)
  }

  const users = createMemo(() => {
    const profiles = state.active?.participantIds.map((id) => state.memberIds[id])
    return profiles || []
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
        if (!char) throw new Error('No character selected')
        return chatStore.addCharacter(chatId, char._id, props.close)
    }
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
            value={'user'}
            onChange={(val) => setType(val.value)}
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
        <Show when={users().length === 0 && charMembers().length === 0}>
          <div class="flex w-full justify-center">There are no particpants in this chat.</div>
        </Show>
        <For each={users()}>
          {(member) => <Participant member={member} remove={setDeleting} canRemove={isOwner()} />}
        </For>
        <For each={charMembers()}>{(charId) => <CharacterParticipant charId={charId} />}</For>
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
    <div class="flex items-center justify-between gap-2 rounded-md bg-[var(--bg-800)] p-2">
      <div class="flex items-center gap-2">
        <AvatarIcon avatarUrl={props.member.avatar} format={{ size: 'md', corners: 'circle' }} />
        <div>{props.member.handle}</div>
        <div class="text-sm italic text-[var(--text-600)]">{props.member.userId.slice(0, 8)}</div>
      </div>
      <div class="flex gap-2">
        <Show when={props.canRemove}>
          <Button schema="clear">
            <Trash onClick={() => props.remove(props.member)} />
          </Button>
        </Show>
      </div>
    </div>
  )
}

const CharacterParticipant: Component<{
  charId: string
}> = (props) => {
  return (
    <div class="flex items-center justify-between gap-2 rounded-md bg-[var(--bg-800)] p-2">
      {props.charId}
    </div>
  )
}
