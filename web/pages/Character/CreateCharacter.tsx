import { Component } from 'solid-js'
import { setComponentPageTitle } from '../../shared/util'
import { useParams, useSearchParams } from '@solidjs/router'
import { CreateCharacterForm } from './CreateCharacterForm'
import { useTransContext } from '@mbarzda/solid-i18next'

const CreateCharacter: Component = () => {
  const [t] = useTransContext()

  const params = useParams<{ editId?: string; duplicateId?: string }>()
  const [query] = useSearchParams()
  setComponentPageTitle(
    params.editId
      ? t('edit_character')
      : params.duplicateId
      ? t('copy_character')
      : t('create_character')
  )
  return (
    <CreateCharacterForm
      editId={params.editId}
      duplicateId={params.duplicateId}
      import={query.import}
    />
  )
}

export default CreateCharacter
