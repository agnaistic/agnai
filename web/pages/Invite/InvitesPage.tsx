import { Check, X } from 'lucide-solid'
import { Component, createEffect, createSignal, For, Show } from 'solid-js'
import PageHeader from '../../shared/PageHeader'
import { toDuration } from '../../shared/util'
import { inviteStore } from '../../store'

export const InvitesPage: Component = () => {
  const state = inviteStore()

  const accept = (inviteId: string) => {
    inviteStore.accept(inviteId)
  }

  const reject = (inviteId: string) => {
    inviteStore.reject(inviteId)
  }

  createEffect(() => {
    inviteStore.getInvites()
  })

  return (
    <div>
      <PageHeader title="Chat Invitations" />

      <div>
        <Show when={!state.invites.length}>
          <div class="text-xl">You have no pending invitations</div>
        </Show>

        <Show when={state.invites.length}>
          <div class="flex flex-col gap-4">
            <div class="flex flex-row gap-2 rounded-xl bg-[var(--bg-900)] p-2 text-lg font-bold">
              <div class="w-3/12">From</div>
              <div class="w-3/12">Character</div>
              <div class="w-3/12">Sent</div>
              <div class="w-3/12"></div>
            </div>

            <For each={state.invites}>
              {(invite) => (
                <div class="flex flex-row gap-2 rounded-xl bg-[var(--bg-900)] p-2">
                  <div class="w-3/12">{() => state.profiles.find(p => p.userId == invite.byUserId)?.handle ?? "Unknown User"}</div>
                  <div class="w-3/12">{() => state.chars.find(c => c._id == invite.characterId)?.name ?? "Unknown Character"}</div>
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
