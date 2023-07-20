import { Component } from 'solid-js'
import { setComponentPageTitle } from '../../shared/util'
import { useParams, useSearchParams } from '@solidjs/router'
import { CreateCharacterForm } from './CreateCharacterForm'

const CreateCharacter: Component = () => {
  const params = useParams<{ editId?: string; duplicateId?: string }>()
  const [query] = useSearchParams()
  setComponentPageTitle(
    params.editId ? 'Edit character' : params.duplicateId ? 'Copy character' : 'Create character'
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
