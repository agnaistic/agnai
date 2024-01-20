import { Check, X } from 'lucide-solid'
import { Component, createEffect, For, Show } from 'solid-js'
import { setComponentPageTitle, toDuration } from '../../shared/util'
import { inviteStore } from '../../store'
import { useNavigate } from '@solidjs/router'
import { SolidCard } from '/web/shared/Card'
import { useTransContext } from '@mbarzda/solid-i18next'

const InvitesPage: Component = () => {
  const [t] = useTransContext()

  setComponentPageTitle(t('invites'))
  const state = inviteStore()
  const nav = useNavigate()

  const accept = (inviteId: string) => {
    const invite = state.invites.find((i) => i._id === inviteId)
    if (!invite) return

    inviteStore.accept(inviteId, () => nav(`/chat/${invite.chatId}`))
  }

  const reject = (inviteId: string) => {
    inviteStore.reject(inviteId)
  }

  createEffect(() => {
    inviteStore.getInvites()
  })

  return (
    <SolidCard border>
      <Show when={!state.invites.length}>
        <div class="text-md font-bold">{t('you_have_no_pending_chat_invitations')}</div>
      </Show>

      <Show when={state.invites.length}>
        <div class="flex flex-col gap-4">
          <div class="bg-900 flex flex-row gap-2 rounded-xl p-2 text-lg font-bold">
            <div class="w-3/12">{t('from')}</div>
            <div class="w-3/12">{t('character')}</div>
            <div class="w-3/12">{t('sent')}</div>
            <div class="w-3/12"></div>
          </div>

          <For each={state.invites}>
            {(invite) => (
              <div class="bg-900 flex flex-row gap-2 rounded-xl p-2">
                <div class="w-3/12">
                  {state.profiles[invite.byUserId]?.handle ?? t('unknown_user')}
                </div>
                <div class="w-3/12">
                  {state.chars[invite.characterId]?.name ?? t('unknown_character')}
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
    </SolidCard>
  )
}

export default InvitesPage
