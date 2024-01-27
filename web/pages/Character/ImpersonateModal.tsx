import { Component } from 'solid-js'
import Modal from '/web/shared/Modal'
import { characterStore, userStore } from '/web/store'
import CharacterSelectList from '/web/shared/CharacterSelectList'
import { AppSchema } from '/common/types'
import Button from '/web/shared/Button'
import { rootModalStore } from '/web/store/root-modal'
import PageHeader from '/web/shared/PageHeader'
import { Trans, useTransContext } from '@mbarzda/solid-i18next'

const ImpersonateModal: Component<{ show: boolean; close: () => void }> = (props) => {
  const [t] = useTransContext()

  const chars = characterStore((s) => s.characters)
  const user = userStore()

  const onSelect = (char?: AppSchema.Character) => {
    characterStore.impersonate(char)
    props.close()
  }

  rootModalStore.addModal({
    id: 'impersonate-modal',
    element: (
      <Modal show={props.show} close={props.close} maxWidth="half" fixedHeight>
        <PageHeader title={t('impersonate_a_character')} subPage />
        <div class="flex flex-col gap-2 text-sm">
          <span>
            <Trans key="instead_of_updating_profile_you_can_impersonate_character">
              Instead of updating your profile to speak as somebody else, you can <b>impersonate</b>
              a character.
            </Trans>
          </span>
          <div class="flex w-full justify-center">
            <Button onClick={() => onSelect()}>{t('use_my_profile')}</Button>
          </div>
          <CharacterSelectList
            items={chars.list.filter((ch) => ch.userId === user.user?._id)}
            onSelect={onSelect}
          />
        </div>
      </Modal>
    ),
  })

  return null
}

export default ImpersonateModal
