import { Component, createEffect, createSignal, Show } from 'solid-js'
import { Save, X } from 'lucide-solid'
import Button from '../../shared/Button'
import PageHeader from '../../shared/PageHeader'
import TextInput from '../../shared/TextInput'
import { FormLabel } from '../../shared/FormLabel'
import RadioGroup from '../../shared/RadioGroup'
import { getFormEntries, getStrictForm } from '../../shared/util'
import FileInput, { FileInputResult } from '../../shared/FileInput'
import { characterStore } from '../../store'
import { useNavigate, useParams } from '@solidjs/router'
import PersonaAttributes, { getAttributeMap } from './PersonaAttributes'
import AvatarIcon from '../../shared/AvatarIcon'

const options = [
  { id: 'wpp', label: 'W++', isChecked: true },
  { id: 'boostyle', label: 'Boostyle' },
  { id: 'sbf', label: 'SBF' },
]

const CreateCharacter: Component = () => {
  const { editId, duplicateId } = useParams()
  const state = characterStore((s) => ({
    edit:
      editId || duplicateId
        ? s.characters.list.find((ch) => ch._id === (editId || duplicateId))
        : undefined,
  }))

  createEffect(() => {
    characterStore.getCharacters()
  })

  const [avatar, setAvatar] = createSignal<File | undefined>(undefined)
  const nav = useNavigate()

  const updateFile = (files: FileInputResult[]) => {
    if (!files.length) return setAvatar()
    const file = files[0].file
    setAvatar(() => file)
  }

  const onSubmit = (ev: Event) => {
    const body = getStrictForm(ev, {
      kind: ['wpp', 'boostyle', 'sbf'],
      name: 'string',
      greeting: 'string',
      scenario: 'string',
      sampleChat: 'string',
    } as const)
    const attributes = getAttributeMap(getFormEntries(ev))
    const persona = {
      kind: body.kind,
      attributes,
    }

    const payload = {
      name: body.name,
      scenario: body.scenario,
      avatar: avatar(),
      greeting: body.greeting,
      sampleChat: body.sampleChat,
      persona,
    }

    if (editId) {
      characterStore.editCharacter(editId, payload, () => nav('/character/list'))
    } else {
      characterStore.createCharacter(payload, () => nav('/character/list'))
    }
  }

  return (
    <div>
      <PageHeader
        title={`${editId ? 'Edit' : duplicateId ? 'Copy' : 'Create'} a Character`}
        subtitle={
          <span>
            For character information tips and information visit{' '}
            <a
              class="text-purple-500"
              href="https://rentry.org/pygtips#character-creation-tips"
              target="_blank"
            >
              https://rentry.org/pygtips#character-creation-tips
            </a>
          </span>
        }
      />

      <form class="flex flex-col gap-4" onSubmit={onSubmit}>
        <TextInput
          fieldName="name"
          required
          label="Character Name"
          helperText="The name of your character."
          placeholder=""
          value={state.edit?.name}
        />

        <div class="flex w-full">
          <Show when={state.edit}>
            <div class="flex items-center">
              <AvatarIcon avatarUrl={state.edit?.avatar} />
            </div>
          </Show>
          <FileInput
            class="w-full"
            fieldName="avatar"
            label="Avatar"
            accept="image/png,image/jpeg"
            onUpdate={updateFile}
          />
        </div>

        <TextInput
          fieldName="scenario"
          label="Scenario"
          helperText="The current circumstances and context of the conversation and the characters."
          value={state.edit?.scenario}
        />

        <TextInput
          isMultiline
          fieldName="greeting"
          label="Greeting"
          helperText="The first message from your character. It is recommended to provide a lengthy first message to encourage the character to give longer responses."
          value={state.edit?.greeting}
        />

        <div>
          <FormLabel label="Persona Schema" helperText="Format to use for the character's format" />
          <RadioGroup name="kind" horizontal options={options} value={state.edit?.persona.kind} />
        </div>

        <PersonaAttributes value={state.edit?.persona.attributes} />

        <TextInput
          isMultiline
          fieldName="sampleChat"
          label="Sample Conversation"
          helperText={
            <span>
              Example chat between you and the character. This section is very important for
              informing the model how your character should speak.
            </span>
          }
          placeholder="You: Hello\n{{char}}: *smiles* Hello!"
          value={state.edit?.sampleChat}
        />

        <div class="flex justify-end gap-2">
          <Button onClick={() => nav('/character/list')} schema="secondary">
            <X />
            Cancel
          </Button>
          <Button type="submit">
            <Save />
            {editId ? 'Update' : 'Create'}
          </Button>
        </div>
      </form>
    </div>
  )
}

export default CreateCharacter
