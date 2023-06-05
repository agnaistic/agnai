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
import { MinusCircle, Plus, Save, X } from 'lucide-solid'
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
  memoryStore,
  presetStore,
} from '../../store'
import { useNavigate, useParams, useSearchParams } from '@solidjs/router'
import PersonaAttributes, { getAttributeMap } from '../../shared/PersonaAttributes'
import AvatarIcon from '../../shared/AvatarIcon'
import { PERSONA_FORMATS } from '../../../common/adapters'
import { getImageData } from '../../store/data/chars'
import Select, { Option } from '../../shared/Select'
import TagInput from '../../shared/TagInput'
import { CultureCodes, defaultCulture } from '../../shared/CultureCodes'
import VoicePicker from './components/VoicePicker'
import { VoiceSettings } from '../../../srv/db/texttospeech-schema'
import { AppSchema } from '../../../srv/db/schema'
import { downloadCharacterHub } from './ImportCharacter'
import { ImageModal } from '../Chat/ImageModal'
import Loading from '/web/shared/Loading'
import { For } from 'solid-js'
import { BUNDLED_CHARACTER_BOOK_ID } from '/common/memory'
import { defaultPresets, isDefaultPreset } from '/common/presets'
import { msgsApi } from '/web/store/data/messages'
import { characterGenTemplate } from '/common/default-preset'
import { toNewCharacter } from './util'

const options = [
  { id: 'wpp', label: 'W++' },
  { id: 'boostyle', label: 'Boostyle' },
  { id: 'sbf', label: 'SBF' },
  { id: 'text', label: 'Plain Text' },
]

const CreateCharacter: Component = () => {
  let ref: any
  const nav = useNavigate()
  const params = useParams<{ editId?: string; duplicateId?: string }>()
  const [query] = useSearchParams()
  setComponentPageTitle(
    params.editId ? 'Edit character' : params.duplicateId ? 'Copy character' : 'Create character'
  )

  const srcId = createMemo(() => params.editId || params.duplicateId || '')
  const [image, setImage] = createSignal<string | undefined>()

  const presets = presetStore()
  const memory = memoryStore()
  const flags = settingStore((s) => s.flags)
  const user = userStore((s) => s.user)
  const tagState = tagStore()
  const state = characterStore((s) => {
    const edit = s.characters.list.find((ch) => ch._id === srcId())
    setImage(edit?.avatar)
    return {
      avatar: s.generate,
      creating: s.creating,
      edit,
      list: s.characters.list,
    }
  })

  const [downloaded, setDownloaded] = createSignal<NewCharacter>()
  const [schema, setSchema] = createSignal<AppSchema.Persona['kind'] | undefined>()
  const [tags, setTags] = createSignal(state.edit?.tags)
  const [characterBook, setCharacterBook] = createSignal(state.edit?.characterBook)
  const [extensions] = createSignal(state.edit?.extensions ?? {})
  const [avatar, setAvatar] = createSignal<File>()
  const [voice, setVoice] = createSignal<VoiceSettings>({ service: undefined })
  const [culture, setCulture] = createSignal(defaultCulture)
  const [creating, setCreating] = createSignal(false)
  const [alternateGreetings, setAlternateGreetings] = createSignal(
    state.edit?.alternateGreetings ?? []
  )

  const edit = createMemo(() => state.edit)

  const isExternalBook = createMemo(() =>
    memory.books.list.every((book) => book._id !== state.edit?.characterBook?._id)
  )

  const bundledBook = createMemo(() => (isExternalBook() ? state.edit?.characterBook : undefined))

  const preferredPreset = createMemo(() => {
    const id = user?.defaultPreset
    if (!id) return

    const preset = isDefaultPreset(id)
      ? defaultPresets[id]
      : presets.presets.find((pre) => pre._id === id)

    return preset
  })

  const canPopulatFields = createMemo(() => {
    return preferredPreset()?.service === 'openai' && !!user?.oaiKeySet
  })

  const generateCharacter = () => {
    if (!canPopulatFields()) return

    const preset = preferredPreset()
    if (!preset) return

    const { description } = getStrictForm(ref, { description: 'string' })
    if (!description) return

    const prompt = characterGenTemplate.replace('{{description}}', description)
    setCreating(true)

    msgsApi.generatePlain({ prompt, settings: preset }, (err, response) => {
      setCreating(false)
      if (err) {
        toastStore.error(`Could not create character: ${err}`)
        return
      }

      const char = toNewCharacter(response!, description)

      setSchema('wpp')
      setDownloaded(char)
    })
  }

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
      characterStore.generateAvatar(user!, imagePrompt || persona)
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

  const onSubmitV2 = (ev: Event) => {
    const body = getStrictForm(ev, {
      kind: PERSONA_FORMATS,
      name: 'string',
      description: 'string?',
      culture: 'string',
      greeting: 'string',
      scenario: 'string',
      sampleChat: 'string',
      systemPrompt: 'string',
      postHistoryInstructions: 'string',
      creator: 'string',
      characterVersion: 'string',
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

      // New fields start here
      systemPrompt: body.systemPrompt ?? '',
      postHistoryInstructions: body.postHistoryInstructions ?? '',
      alternateGreetings: alternateGreetings() ?? '',
      characterBook: characterBook(),
      creator: body.creator ?? '',
      extensions: extensions(),
      characterVersion: body.characterVersion ?? '',
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
      />

      <form class="flex flex-col gap-4" onSubmit={flags.charv2 ? onSubmitV2 : onSubmit} ref={ref}>
        <TextInput
          fieldName="name"
          required
          label="Character Name"
          helperText="The name of your character."
          placeholder=""
          value={downloaded()?.name || state.edit?.name}
        />

        <div class="flex w-full flex-col">
          <FormLabel
            label="Description"
            helperText={
              <div class="flex flex-col">
                <span>
                  A description or label for your character. This is will not influence your
                  character in any way.
                </span>
                <Show when={canPopulatFields()}>
                  <span>
                    To use OpenAI to generate a character, describe the character below then click{' '}
                    <b>Generate</b>. It can take 30-60 seconds.
                  </span>
                </Show>
              </div>
            }
          />
          <div class="flex w-full gap-2">
            <TextInput
              isMultiline
              fieldName="description"
              parentClass="w-full"
              value={downloaded()?.description || state.edit?.description}
            />
            <Show when={canPopulatFields()}>
              <Button onClick={generateCharacter} disabled={creating()}>
                {creating() ? 'Generating...' : 'Generate'}
              </Button>
            </Show>
          </div>
        </div>

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
              accept="image/png,image/jpeg,image/apng"
              onUpdate={updateFile}
            />
            <div class="flex w-full gap-2">
              <TextInput
                parentClass="w-full"
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
        <Show when={flags.charv2}>
          <AlternateGreetingsInput
            greetings={alternateGreetings()}
            setGreetings={setAlternateGreetings}
          />
        </Show>

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
            value={state.edit?.persona.kind || schema() || 'text'}
            onChange={(kind) => setSchema(kind as any)}
          />
        </div>

        <Show when={!params.editId && !params.duplicateId}>
          <PersonaAttributes
            value={downloaded()?.persona.attributes}
            plainText={schema() === 'text' || schema() === undefined}
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
        <Show when={flags.charv2}>
          <h2 class="mt-3 text-lg font-bold">Advanced options</h2>
          <TextInput
            isMultiline
            fieldName="systemPrompt"
            label="Character System Prompt (optional)"
            helperText={
              <span>
                System prompt to bundle with your character. Leave empty if you aren't sure.
              </span>
            }
            placeholder="Enter roleplay mode. You will write {{char}}'s next reply in a dialogue between {{char}} and {{user}}. Do not decide what {{user}} says or does. Use Internet roleplay style, e.g. no quotation marks, and write user actions in italic in third person like: *example*. You are allowed to use markdown. Be proactive, creative, drive the plot and conversation forward. Write at least one paragraph, up to four. Always stay in character. Always keep the conversation going. (Repetition is highly discouraged)"
            value={state.edit?.systemPrompt}
          />
          <TextInput
            isMultiline
            fieldName="postHistoryInstructions"
            label="Post-conversation history instructions (optional)"
            helperText={
              <span>Prompt to bundle with your character. Leave empty if you aren't sure.</span>
            }
            placeholder="Write at least four paragraphs."
            value={state.edit?.postHistoryInstructions}
          />
          <MemoryBookPicker
            characterBook={characterBook()}
            setCharacterBook={setCharacterBook}
            bundledBook={bundledBook()}
          />
          <TextInput
            fieldName="creator"
            label="Creator (optional)"
            placeholder="e.g. John1990"
            value={state.edit?.creator}
          />
          <TextInput
            fieldName="characterVersion"
            label="Character Version (optional)"
            placeholder="any text e.g. 1, 2, v1, v1fempov..."
            value={state.edit?.characterVersion}
          />
        </Show>

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

const AlternateGreetingsInput: Component<{
  greetings: string[]
  setGreetings: (next: string[]) => void
}> = (props) => {
  const addGreeting = () => props.setGreetings([...props.greetings, ''])
  const removeGreeting = (i: number) => {
    return props.setGreetings(props.greetings.slice(0, i).concat(props.greetings.slice(i + 1)))
  }

  const onChange = (ev: { currentTarget: HTMLInputElement | HTMLTextAreaElement }, i: number) => {
    props.setGreetings(
      props.greetings.map((orig, j) => (j === i ? ev.currentTarget?.value ?? '' : orig))
    )
  }

  return (
    <>
      <For each={props.greetings}>
        {(altGreeting, i) => (
          <div class="flex gap-2">
            <TextInput
              parentClass='grow'
              isMultiline
              fieldName={`alternateGreeting${i() + 1}`}
              placeholder="An alternate greeting for your character"
              value={altGreeting}
              onChange={(ev) => onChange(ev, i())}
              parentClass="w-full"
            />
            <div class="1/12 flex items-center" onClick={() => removeGreeting(i())}>
              <MinusCircle size={16} class="focusable-icon-button" />
            </div>
          </div>
        )}
      </For>
      <div>
        <Button onClick={addGreeting}>
          <Plus size={16} />
          Add Alternate Greeting
        </Button>
      </div>
    </>
  )
}

// TODO: Character Book can only be imported from Agnai Memory books. It is not possible yet to edit a Character Book that was bundled with a downloaded character card.
const MemoryBookPicker: Component<{
  bundledBook: AppSchema.MemoryBook | undefined
  characterBook: AppSchema.MemoryBook | undefined
  setCharacterBook: (newVal: AppSchema.MemoryBook | undefined) => void
}> = (props) => {
  const memory = memoryStore()
  const bookOptions = createMemo(() =>
    memory.books.list.map((book) => ({ label: book.name, value: book._id }))
  )
  const NONE_VALUE = '__bundled__none__'
  const onChange = (option: Option) => {
    if (option.value == NONE_VALUE) {
      props.setCharacterBook(undefined)
    } else {
      const isBundledMemoryBook = props.characterBook?._id === BUNDLED_CHARACTER_BOOK_ID
      const newBook = isBundledMemoryBook
        ? props.bundledBook
        : memory.books.list.find((book) => book._id === option.value)
      props.setCharacterBook(newBook)
    }
  }
  const dropdownItems = () => [
    { label: 'None', value: NONE_VALUE },
    ...(props.bundledBook
      ? [{ label: 'Imported with card', value: BUNDLED_CHARACTER_BOOK_ID }]
      : []),
    ...bookOptions(),
  ]
  return (
    <Select
      fieldName="memoryBook"
      label="Character Memory Book"
      helperText="Memory book to bundle with this character."
      value={props.characterBook?._id ?? props.bundledBook ? BUNDLED_CHARACTER_BOOK_ID : NONE_VALUE}
      items={dropdownItems()}
      onChange={onChange}
    />
  )
}

export default CreateCharacter
