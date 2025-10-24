import { Component, createMemo, Show } from 'solid-js'
import { RootModal } from '/web/shared/Modal'
import { characterStore, userStore } from '/web/store'
import CharacterSelectList, { CharacterSelectItem } from '/web/shared/CharacterSelectList'
import { AppSchema } from '/common/types'
import Button from '/web/shared/Button'
import PageHeader from '/web/shared/PageHeader'
import { HeartPlus, X } from 'lucide-solid'
import { isChatPageMemo } from '/web/shared/hooks'

const ImpersonateModal: Component<{ show: boolean; close: () => void }> = (props) => {
  const isChat = isChatPageMemo()

  const state = characterStore((s) => ({
    chars: s.characters,
    chatId: s.activeChatId,
    defaultId: s.defaultImpersonateId,
    impersonating: s.impersonating,
  }))
  const user = userStore((s) => ({ user: s.user }))

  const onSelect = (char?: AppSchema.Character) => {
    const match = char ? state.chars.list.find((c) => c._id === char?._id) : undefined

    characterStore.impersonate(match || char)
    props.close()
  }

  const clearImpersonate = () => {
    characterStore.defaultImpersonate('')
  }

  const currentChar = createMemo(() => {
    if (!isChat()) return
    if (!state.impersonating) return
    return { ...state.impersonating, name: `${state.impersonating.name} (Current)` }
  })

  const defaultChar = createMemo(() => {
    if (!state.defaultId) return
    const char = state.chars.map[state.defaultId]
    if (!char) return

    const next = {
      ...char,
      name: `${char.name.trim()} (Default)`,
      description: 'Default for new conversations',
    }
    return next
  })

  const options = createMemo(() => {
    const curr = currentChar()
    const items = state.chars.list
      .filter((ch) => ch.userId === user.user?._id)
      .map((char) => {
        if (curr?._id !== char._id) return char
        return { ...char, name: `${char.name} (Current)` }
      })

    return items
  })

  return (
    <RootModal
      show={props.show}
      close={props.close}
      maxWidth="half"
      fixedHeight
      title="Impersonate"
    >
      <PageHeader title="" subPage />
      <div class="flex flex-col justify-center gap-2 text-sm">
        <Show
          when={!state.chatId}
          fallback={<p class="font-bold">Change your current chat persona.</p>}
        >
          <p class="font-bold">Change your default persona.</p>
        </Show>
        <p>
          Use <a class="link">character impersonation</a> to speak as another persona in a
          conversation.
        </p>
        <div class="flex w-full justify-center">
          <Button onClick={() => onSelect()}>Use My Profile</Button>
        </div>

        <Show when={!!defaultChar()}>
          <CharacterSelectItem
            char={defaultChar()!}
            onClick={onSelect}
            adornment={() => (
              <div class="icon-button" onClick={clearImpersonate}>
                <X />
              </div>
            )}
          />
        </Show>
        <CharacterSelectList items={options()} onSelect={onSelect} adornment={DefaultToggle} />
      </div>
    </RootModal>
  )
}

export default ImpersonateModal

const DefaultToggle: Component<{ char: AppSchema.Character }> = (props) => {
  return (
    <div class="icon-button" onClick={() => characterStore.defaultImpersonate(props.char._id)}>
      <HeartPlus />
    </div>
  )
}
