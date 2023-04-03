import { Trash } from 'lucide-solid'
import { Component, createMemo, createSignal, For, Show } from 'solid-js'
import { AppSchema } from '../../../srv/db/schema'
import AvatarIcon from '../../shared/AvatarIcon'
import Button from '../../shared/Button'
import Modal, { ConfirmModal } from '../../shared/Modal'
import { chatStore, userStore } from '../../store'

const MemberModal: Component<{ show: boolean; close: () => void }> = (props) => {
  const self = userStore()
  const state = chatStore()

  const [deleting, setDeleting] = createSignal<AppSchema.Profile>()
  const isOwner = createMemo(() => self.user?._id === state.active?.chat.userId)

  const remove = () => {
    const member = deleting()
    if (!member) return
    if (!state.active?.chat) return
    chatStore.uninviteUser(state.active?.chat._id, member.userId)
  }

  const nonOwners = createMemo(() => {
    const profiles = state.active?.participantIds.map((id) => state.memberIds[id])
    return profiles || []
  })

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
        <Show when={nonOwners().length === 0}>
          <div class="flex w-full justify-center">There are no particpants in this chat.</div>
        </Show>
        <For each={nonOwners()}>
          {(member) => <Participant member={member} remove={setDeleting} canRemove={isOwner()} />}
        </For>
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
