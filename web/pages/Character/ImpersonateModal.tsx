import { Component } from 'solid-js'
import Modal from '/web/shared/Modal'
import { characterStore, userStore } from '/web/store'
import CharacterSelectList from '/web/shared/CharacterSelectList'
import { AppSchema } from '/common/types'
import Button from '/web/shared/Button'

const ImpersonateModal: Component<{ show: boolean; close: () => void }> = (props) => {
  const chars = characterStore((s) => s.characters)
  const user = userStore()

  const onSelect = (char?: AppSchema.Character) => {
    characterStore.impersonate(char)
    props.close()
  }

  return (
    <Modal title="Impersonate a Character" show={props.show} close={props.close} maxWidth="half">
      <div class="flex flex-col gap-2 text-sm">
        <span>
          Instead of updating your profile to speak as somebody else, you can <b>impersonate</b> a
          character.
        </span>
        <div class="flex w-full justify-center">
          <Button onClick={() => onSelect()}>Use My Profile</Button>
        </div>
        <CharacterSelectList
          items={chars.list.filter((ch) => ch.userId === user.user?._id)}
          onSelect={onSelect}
        />
      </div>
    </Modal>
  )
}

export default ImpersonateModal
