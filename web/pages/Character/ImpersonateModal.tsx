import { Component } from 'solid-js'
import Modal from '/web/shared/Modal'
import { characterStore } from '/web/store'
import CharacterSelectList from '/web/shared/CharacterSelectList'
import { AppSchema } from '/srv/db/schema'
import Button from '/web/shared/Button'

const ImpersonateModal: Component<{ show: boolean; close: () => void }> = (props) => {
  const chars = characterStore((s) => s.characters)

  const onSelect = (char?: AppSchema.Character) => {
    if (!char) return
    characterStore.impersonate(char)
    props.close()
  }

  return (
    <Modal title="Impersonate a Character" show={props.show} close={props.close}>
      Instead of updating your profile to speak as somebody else, you can <b>impersonate</b> a
      character.
      <div class="flex w-full justify-center">
        <Button>Use My Profile</Button>
      </div>
      <CharacterSelectList items={chars.list} onSelect={onSelect} />
    </Modal>
  )
}

export default ImpersonateModal
