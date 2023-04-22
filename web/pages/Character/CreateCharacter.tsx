import { Component, createEffect, createMemo, createSignal, onMount, Show } from 'solid-js'
import { Save, X } from 'lucide-solid'
import Button from '../../shared/Button'
import PageHeader from '../../shared/PageHeader'
import TextInput from '../../shared/TextInput'
import { FormLabel } from '../../shared/FormLabel'
import RadioGroup from '../../shared/RadioGroup'
import { getStrictForm, setComponentPageTitle } from '../../shared/util'
import FileInput, { FileInputResult } from '../../shared/FileInput'
import { characterStore } from '../../store'
import { useNavigate, useParams } from '@solidjs/router'
import PersonaAttributes, { getAttributeMap } from '../../shared/PersonaAttributes'
import AvatarIcon from '../../shared/AvatarIcon'
import { PERSONA_FORMATS } from '../../../common/adapters'
import { getImageData } from '../../store/data/chars'

const options = [
  { id: 'boostyle', label: 'Boostyle' },
  { id: 'wpp', label: 'W++' },
  { id: 'sbf', label: 'SBF' },
  { id: 'text', label: 'Plain Text' },
]

const CreateCharacter: Component = () => {
  const params = useParams<{ editId?: string; duplicateId?: string }>()
  setComponentPageTitle(
    params.editId ? 'Edit character' : params.duplicateId ? 'Copy character' : 'Create character'
  )
  const [image, setImage] = createSignal<string | undefined>()

  const srcId = params.editId || params.duplicateId || ''
  const state = characterStore((s) => {
    const edit = s.characters.list.find((ch) => ch._id === srcId)
    setImage(edit?.avatar)
    return {
      creating: s.creating,
      edit,
    }
  })

  onMount(() => {
    characterStore.getCharacters()
  })

  const [schema, setSchema] = createSignal(state.edit?.persona.kind)
  const [avatar, setAvatar] = createSignal<File | undefined>(undefined)
  const nav = useNavigate()

  createEffect(() => {
    if (!schema() && state.edit?.persona.kind) {
      setSchema(state.edit?.persona.kind)
    }
  })

  const updateFile = async (files: FileInputResult[]) => {
    if (!files.length) {
      setAvatar()
      setImage(state.edit?.avatar)
      return
    }

    const file = files[0].file
    setAvatar(() => file)
    const data = await getImageData(file)
    setImage(data)
  }

  const onSubmit = (ev: Event) => {
    const body = getStrictForm(ev, {
      kind: PERSONA_FORMATS,
      name: 'string',
      description: 'string?',
      greeting: 'string',
      scenario: 'string',
      sampleChat: 'string',
    } as const)
    const attributes = getAttributeMap(ev)

    const persona = {
      kind: body.kind,
      attributes,
    }

    const payload = {
      name: body.name,
      description: body.description,
      scenario: body.scenario,
      avatar: avatar(),
      greeting: body.greeting,
      sampleChat: body.sampleChat,
      persona,
      originalAvatar: state.edit?.avatar,
    }

    if (params.editId) {
      characterStore.editCharacter(params.editId, payload, () => nav('/character/list'))
    } else {
      characterStore.createCharacter(payload, () => nav('/character/list'))
    }
  }

  return (
    <div>
      <PageHeader
        title={`${params.editId ? 'Edit' : params.duplicateId ? 'Copy' : 'Create'} a Character`}
        subtitle={
          <span>
            For character information tips and information visit{' '}
            <a
              class="link"
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

        <TextInput
          fieldName="description"
          label="Description"
          helperText="A description or label for your character. This is will not influence your character in any way."
          placeholder=""
          value={state.edit?.description}
        />

        <div class="flex w-full gap-2">
          <Show when={state.edit}>
            <div class="flex items-center">
              <AvatarIcon format={{ corners: 'md', size: '3xl' }} avatarUrl={image()} />
            </div>
          </Show>
          <FileInput
            class="w-full"
            fieldName="avatar"
            label="Avatar"
            accept="image/png,image/jpeg"
            onUpdate={updateFile}
          />
          <div class="flex items-end">{/* <Button>Generate</Button> */}</div>
        </div>

        <TextInput
          fieldName="scenario"
          label="Scenario"
          helperText="The current circumstances and context of the conversation and the characters."
          placeholder="E.g. {{char}} is in their office working. {{user}} opens the door and walks in."
          value={state.edit?.scenario}
          isMultiline
        />

        <TextInput
          isMultiline
          fieldName="greeting"
          label="Greeting"
          helperText="The first message from your character. It is recommended to provide a lengthy first message to encourage the character to give longer responses."
          placeholder={
            "E.g. *I smile as you walk into the room* Hello, {{user}}! I can't believe it's lunch time already! Where are we going?"
          }
          value={state.edit?.greeting}
        />

        <div>
          <FormLabel
            label="Persona Schema"
            helperText={
              <>
                <p>If you do not know what this mean, you can leave this as-is.</p>
                <p class="font-bold">
                  WARNING: "Plain Text" and "Non-Plain Text" schemas are not compatible. Changing
                  between them will cause data loss.
                </p>
                <p>Format to use for the character's format</p>
              </>
            }
          />
          <RadioGroup
            name="kind"
            horizontal
            options={options}
            value={state.edit?.persona.kind || 'boostyle'}
            onChange={(kind) => setSchema(kind as any)}
          />
        </div>

        <Show when={!params.editId && !params.duplicateId}>
          <PersonaAttributes plainText={schema() === 'text'} />
        </Show>

        <Show when={(params.editId || params.duplicateId) && state.edit}>
          <PersonaAttributes
            value={state.edit?.persona.attributes}
            plainText={schema() === 'text'}
          />
        </Show>

        <TextInput
          isMultiline
          fieldName="sampleChat"
          label="Sample Conversation"
          helperText={
            <span>
              Example chat between you and the character. This section is very important for
              teaching your character should speak.
            </span>
          }
          placeholder="{{user}}: Hello! *waves excitedly* \n{{char}}: *smiles and waves back* Hello! I'm so happy you're here!"
          value={state.edit?.sampleChat}
        />

        <div class="flex justify-end gap-2">
          <Button onClick={() => nav('/character/list')} schema="secondary">
            <X />
            Cancel
          </Button>
          <Button type="submit" disabled={state.creating}>
            <Save />
            {params.editId ? 'Update' : 'Create'}
          </Button>
        </div>
      </form>
    </div>
  )
}

export default CreateCharacter
