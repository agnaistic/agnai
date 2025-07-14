import { Component, Show } from 'solid-js'
import { RootModal } from '/web/shared/Modal'
import { characterStore, userStore } from '/web/store'
import CharacterSelectList from '/web/shared/CharacterSelectList'
import { AppSchema } from '/common/types'
import Button from '/web/shared/Button'
import PageHeader from '/web/shared/PageHeader'

const ImpersonateModal: Component<{ show: boolean; close: () => void }> = (props) => {
  const state = characterStore((s) => ({ chars: s.characters, chatId: s.activeChatId }))
  const user = userStore()

  const onSelect = (char?: AppSchema.Character) => {
    characterStore.impersonate(char)
    props.close()
  }

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
        <CharacterSelectList
          items={state.chars.list.filter((ch) => ch.userId === user.user?._id)}
          onSelect={onSelect}
        />
      </div>
    </RootModal>
  )
}

export default ImpersonateModal
