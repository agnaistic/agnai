import { Component, createMemo, Show } from 'solid-js'
import Modal from '/web/shared/Modal'
import { characterStore, userStore } from '/web/store'
import CharacterSelectList from '/web/shared/CharacterSelectList'
import { AppSchema } from '/common/types'
import Button from '/web/shared/Button'
import { rootModalStore } from '/web/store/root-modal'
import PageHeader from '/web/shared/PageHeader'
import { CharacterAvatar } from '/web/shared/AvatarIcon'
import { Star, X } from 'lucide-solid'

const ImpersonateModal: Component<{ show: boolean; close: () => void }> = (props) => {
  const charStore = characterStore()
  const chars = createMemo(() => charStore.characters)
  const impersonating = createMemo(() => charStore.impersonating)
  const user = userStore()

  const onSelect = (char?: AppSchema.Character) => {
    characterStore.impersonate(char)
    props.close()
  }

  rootModalStore.addModal({
    id: 'impersonate-modal',
    element: (
      <Modal show={props.show} close={props.close} maxWidth="half" fixedHeight>
        <PageHeader title="Impersonate a Character" subPage />
        <div class="flex flex-col gap-2 text-sm">
          <span>
            Instead of updating your profile to speak as somebody else, you can <b>impersonate</b> a
            character.
          </span>
          <Show when={impersonating()}>
            <div class="flex w-full justify-center gap-2 p-2">
              <div class="bg-700 flex w-full cursor-pointer flex-row items-center justify-between gap-4 rounded-xl px-2 py-1">
                <div class="ellipsis flex items-center gap-4">
                  <CharacterAvatar
                    char={impersonating()!}
                    format={{ size: 'sm', corners: 'circle' }}
                  />

                  <div class="ellipsis flex w-full flex-col">
                    <div class="ellipsis font-bold">{impersonating()!.name}</div>
                    <div class="ellipsis">{impersonating()!.description}</div>
                  </div>
                </div>
                <div>
                  <div class="hidden flex-row items-center justify-center gap-2 sm:flex">
                    <Show when={impersonating()?.favorite}>
                      <Star class="icon-button fill-[var(--text-900)] text-[var(--text-900)]" />
                    </Show>
                  </div>
                </div>
              </div>

              <Button ariaLabel="Stop impersonating" onClick={() => onSelect()}>
                <X />
              </Button>
            </div>
          </Show>
          <CharacterSelectList
            items={chars().list.filter(
              (ch) => impersonating()?._id !== ch._id && ch.userId === user.user?._id
            )}
            onSelect={onSelect}
          />
        </div>
      </Modal>
    ),
  })

  return null
}

export default ImpersonateModal
