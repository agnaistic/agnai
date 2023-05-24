import { Check, Timer, X } from 'lucide-solid'
import { Component, createEffect, For, Show } from 'solid-js'
import PageHeader from '../../shared/PageHeader'
import { setComponentPageTitle, toDuration } from '../../shared/util'
import { inviteStore } from '../../store'
import { useNavigate } from '@solidjs/router'

const InvitesPage: Component = () => {
  setComponentPageTitle('Invites')
  const state = inviteStore()
  const nav = useNavigate()

  const accept = (inviteId: string) => {
    const invite = state.received.find((i) => i._id === inviteId)
    if (!invite) return

    inviteStore.accept(inviteId, () => nav(`/chat/${invite.chatId}`))
  }

  const reject = (inviteId: string) => {
    inviteStore.reject(inviteId)
  }

  const cancel = (inviteId: string) => {
    inviteStore.cancel(inviteId)
  }

  createEffect(() => {
    inviteStore.getInvites()
  })

  return (
    <div>
      <PageHeader title="Chat Invitations" />

      <div>
        <h2 class="mt-8 mb-8 text-lg">Sent Invites</h2>

        <Show when={!state.sent.length}>
          <div class="text-700">You have no sent invitations</div>
        </Show>

        <Show when={state.sent.length}>
          <div class="flex flex-col gap-4">
            <div class="flex flex-row gap-2 rounded-xl bg-[var(--bg-900)] p-2 text-lg font-bold">
              <div class="w-3/12">To</div>
              <div class="w-3/12">Character</div>
              <div class="w-3/12">Sent</div>
              <div class="w-3/12"></div>
            </div>

            <For each={state.sent}>
              {(invite) => (
                <div class="flex flex-row gap-2 rounded-xl bg-[var(--bg-900)] p-2">
                  <div class="w-3/12">
                    {state.profiles[invite.invitedId]?.handle ?? 'Unknown User'}
                  </div>
                  <div class="w-3/12">
                    {state.chars[invite.characterId]?.name ?? 'Unknown Character'}
                  </div>
                  <div class="w-3/12">{toDuration(new Date(invite.createdAt))}</div>
                  <div class="flex w-3/12 justify-end gap-4">
                    <div class="cursor-pointer" onClick={() => cancel(invite._id)}>
                      <X class="text-red-600 hover:text-red-300" />
                    </div>
                    <div>
                      <Timer class="text-600" />
                    </div>
                  </div>
                </div>
              )}
            </For>
          </div>
        </Show>
      </div>

      <div>
        <h2 class="mt-8 mb-8 text-lg">Received Invites</h2>

        <Show when={!state.received.length}>
          <div class="text-700">You have no pending invitations</div>
        </Show>

        <Show when={state.received.length}>
          <div class="flex flex-col gap-4">
            <div class="flex flex-row gap-2 rounded-xl bg-[var(--bg-900)] p-2 text-lg font-bold">
              <div class="w-3/12">From</div>
              <div class="w-3/12">Character</div>
              <div class="w-3/12">Sent</div>
              <div class="w-3/12"></div>
            </div>

            <For each={state.received}>
              {(invite) => (
                <div class="flex flex-row gap-2 rounded-xl bg-[var(--bg-900)] p-2">
                  <div class="w-3/12">
                    {state.profiles[invite.byUserId]?.handle ?? 'Unknown User'}
                  </div>
                  <div class="w-3/12">
                    {state.chars[invite.characterId]?.name ?? 'Unknown Character'}
                  </div>
                  <div class="w-3/12">{toDuration(new Date(invite.createdAt))}</div>
                  <div class="flex w-3/12 justify-end gap-4">
                    <div class="cursor-pointer" onClick={() => reject(invite._id)}>
                      <X class="text-red-600 hover:text-red-300" />
                    </div>

                    <div class="cursor-pointer" onClick={() => accept(invite._id)}>
                      <Check class="text-green-600 hover:text-green-300" />
                    </div>
                  </div>
                </div>
              )}
            </For>
          </div>
        </Show>
      </div>
    </div>
  )
}

export default InvitesPage
