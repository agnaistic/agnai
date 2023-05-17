import {
  Component,
  createEffect,
  createMemo,
  createSignal,
  Match,
  on,
  onMount,
  Show,
  Switch,
} from 'solid-js'
import { Save, X } from 'lucide-solid'
import Button from '../../shared/Button'
import PageHeader from '../../shared/PageHeader'
import TextInput from '../../shared/TextInput'
import { FormLabel } from '../../shared/FormLabel'
import RadioGroup from '../../shared/RadioGroup'
import { getStrictForm, setComponentPageTitle } from '../../shared/util'
import FileInput, { FileInputResult } from '../../shared/FileInput'
import {
  characterStore,
  NewCharacter,
  tagStore,
  settingStore,
  toastStore,
  userStore,
} from '../../store'
import { useNavigate, useParams, useSearchParams } from '@solidjs/router'
import PersonaAttributes, { getAttributeMap } from '../../shared/PersonaAttributes'
import AvatarIcon from '../../shared/AvatarIcon'
import { PERSONA_FORMATS } from '../../../common/adapters'
import { getImageData } from '../../store/data/chars'
import Select from '../../shared/Select'
import TagInput from '../../shared/TagInput'
import { CultureCodes, defaultCulture } from '../../shared/CultureCodes'
import VoicePicker from './components/VoicePicker'
import { VoiceSettings } from '../../../srv/db/texttospeech-schema'
import { AppSchema } from '../../../srv/db/schema'
import { downloadCharacterHub } from './ImportCharacter'
import { ImageModal } from '../Chat/ImageModal'
import Loading from '/web/shared/Loading'

const options = [
  { id: 'boostyle', label: 'Boostyle' },
  { id: 'wpp', label: 'W++' },
  { id: 'sbf', label: 'SBF' },
  { id: 'text', label: 'Plain Text' },
]

const CreateCharacter: Component = () => {
  const user = userStore()
  const devModeOn = createMemo(() => user.devMode ?? false)
  return devModeOn() ? <CreateCharacterV2 /> : <CreateCharacterV1 />
}

const CreateCharacterV1: Component = () => {
  let ref: any
  const params = useParams<{ editId?: string; duplicateId?: string }>()
  const [query] = useSearchParams()
  setComponentPageTitle(
    params.editId ? 'Edit character' : params.duplicateId ? 'Copy character' : 'Create character'
  )
  const [image, setImage] = createSignal<string | undefined>()
  const [downloaded, setDownloaded] = createSignal<NewCharacter>()

  const srcId = params.editId || params.duplicateId || ''
  const state = characterStore((s) => {
    const edit = s.characters.list.find((ch) => ch._id === srcId)
    setImage(edit?.avatar)
    return {
      avatar: s.generate,
      creating: s.creating,
      edit,
      list: s.characters.list,
    }
  })
  const user = userStore((s) => s.user)
  const tagState = tagStore()

  onMount(async () => {
    characterStore.clearGeneratedAvatar()
    characterStore.getCharacters()

    if (!query.import) return
    try {
      const { file, json } = await downloadCharacterHub(query.import)
      const imageData = await getImageData(file)
      setDownloaded(json)
      setImage(imageData)
      setAvatar(() => file)
      setSchema('text')
      toastStore.success(`Successfully downloaded from Character Hub`)
    } catch (ex: any) {
      toastStore.error(`Character Hub download failed: ${ex.message}`)
    }
  })

  const [schema, setSchema] = createSignal<AppSchema.Persona['kind'] | undefined>()
  const [tags, setTags] = createSignal(state.edit?.tags)
  const [avatar, setAvatar] = createSignal<File>()
  const [voice, setVoice] = createSignal<VoiceSettings>({ service: undefined })
  const [culture, setCulture] = createSignal(defaultCulture)
  const edit = createMemo(() => state.edit)
  const nav = useNavigate()

  createEffect(
    on(edit, (edit) => {
      if (!edit) return
      setSchema(edit.persona.kind)
      setVoice(edit.voice || { service: undefined })
      setCulture(edit.culture ?? defaultCulture)
      setTags(edit.tags)
    })
  )

  createEffect(() => {
    tagStore.updateTags(state.list)
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

  const generateAvatar = async () => {
    const { imagePrompt } = getStrictForm(ref, { imagePrompt: 'string' })
    if (!user) {
      toastStore.error(`Image generation settings missing`)
      return
    }

    const attributes = getAttributeMap(ref)
    const persona: AppSchema.Persona = {
      kind: 'boostyle',
      attributes,
    }

    try {
      characterStore.generateAvatar(user, imagePrompt || persona)
    } catch (ex: any) {
      toastStore.error(ex.message)
    }
  }

  const onSubmit = (ev: Event) => {
    const body = getStrictForm(ev, {
      kind: PERSONA_FORMATS,
      name: 'string',
      description: 'string?',
      culture: 'string',
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
      culture: body.culture,
      tags: tags(),
      scenario: body.scenario,
      avatar: state.avatar.blob || avatar(),
      greeting: body.greeting,
      sampleChat: body.sampleChat,
      persona,
      originalAvatar: state.edit?.avatar,
      voice: voice(),
    }

    if (params.editId) {
      characterStore.editCharacter(params.editId, payload, () =>
        nav(`/character/${params.editId}/chats`)
      )
    } else {
      characterStore.createCharacter(payload, (result) => nav(`/character/${result._id}/chats`))
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

      <form class="flex flex-col gap-4" onSubmit={onSubmit} ref={ref}>
        <TextInput
          fieldName="name"
          required
          label="Character Name"
          helperText="The name of your character."
          placeholder=""
          value={downloaded()?.name || state.edit?.name}
        />

        <TextInput
          fieldName="description"
          label="Description"
          helperText="A description or label for your character. This is will not influence your character in any way."
          placeholder=""
          value={downloaded()?.description || state.edit?.description}
        />

        <TagInput
          availableTags={tagState.tags.map((t) => t.tag)}
          value={tags()}
          fieldName="tags"
          label="Tags"
          helperText="Used to help you organize and filter your characters."
          onSelect={setTags}
        />

        <div class="flex w-full gap-2">
          <Switch>
            <Match when={!state.avatar.loading}>
              <div
                class="flex items-center"
                style={{ cursor: state.avatar.image || image() ? 'pointer' : 'unset' }}
                onClick={() => settingStore.showImage(state.avatar.image || image())}
              >
                <AvatarIcon
                  format={{ corners: 'md', size: '2xl' }}
                  avatarUrl={state.avatar.image || image()}
                />
              </div>
            </Match>
            <Match when={state.avatar.loading}>
              <div class="flex w-[80px] items-center justify-center">
                <Loading />
              </div>
            </Match>
          </Switch>
          <div class="flex w-full flex-col gap-2">
            <FileInput
              class="w-full"
              fieldName="avatar"
              label="Avatar"
              helperText='Use the "appearance" attribute in your persona to influence the generated images'
              accept="image/png,image/jpeg"
              onUpdate={updateFile}
            />
            <div class="flex gap-2">
              <TextInput
                fieldName="imagePrompt"
                placeholder='Image prompt: Leave empty to use "looks / "appearance"'
              />
              <Button class="w-fit" onClick={generateAvatar}>
                Generate
              </Button>
            </div>
          </div>
        </div>

        <Select
          fieldName="culture"
          label="Language"
          helperText={`The language this character speaks and understands.${
            culture()?.startsWith('en') ?? true
              ? ''
              : ' NOTE: You need to also translate the preset gaslight to use a non-english language.'
          }`}
          value={culture()}
          items={CultureCodes}
          onChange={setCulture}
        />

        <TextInput
          fieldName="scenario"
          label="Scenario"
          helperText="The current circumstances and context of the conversation and the characters."
          placeholder="E.g. {{char}} is in their office working. {{user}} opens the door and walks in."
          value={downloaded()?.scenario || state.edit?.scenario}
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
          value={downloaded()?.greeting || state.edit?.greeting}
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
            value={state.edit?.persona.kind || schema() || 'boostyle'}
            onChange={(kind) => setSchema(kind as any)}
          />
        </div>

        <Show when={!params.editId && !params.duplicateId}>
          <PersonaAttributes
            value={downloaded()?.persona.attributes}
            plainText={schema() === 'text'}
          />
        </Show>

        <Show when={(params.editId || params.duplicateId) && state.edit}>
          <PersonaAttributes
            value={downloaded()?.persona.attributes || state.edit?.persona.attributes}
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
          value={downloaded()?.sampleChat || state.edit?.sampleChat}
        />

        <h4 class="text-md font-bold">Character Voice</h4>
        <VoicePicker value={voice()} culture={culture()} onChange={setVoice} />

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
      <ImageModal />
    </div>
  )
}

const CreateCharacterV2 = () => {
  return <div>dev</div>
}

export default CreateCharacter
