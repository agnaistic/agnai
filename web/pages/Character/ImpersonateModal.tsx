import { Component, createMemo, Show } from 'solid-js'
import { RootModal } from '/web/shared/Modal'
import { characterStore, userStore } from '/web/store'
import CharacterSelectList, { CharacterSelectItem } from '/web/shared/CharacterSelectList'
import { AppSchema } from '/common/types'
import Button from '/web/shared/Button'
import PageHeader from '/web/shared/PageHeader'
import { HeartPlus } from 'lucide-solid'

const ImpersonateModal: Component<{ show: boolean; close: () => void }> = (props) => {
  const state = characterStore((s) => ({
    chars: s.characters,
    chatId: s.activeChatId,
    defaultId: s.defaultImpersonateId,
  }))
  const user = userStore()

  const onSelect = (char?: AppSchema.Character) => {
    characterStore.impersonate(char)
    props.close()
  }

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
          <CharacterSelectItem char={defaultChar()!} onClick={onSelect} />
        </Show>
        <CharacterSelectList
          items={state.chars.list.filter((ch) => ch.userId === user.user?._id)}
          onSelect={onSelect}
          adornment={DefaultToggle}
        />
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
