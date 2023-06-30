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
import { MinusCircle, Plus, Save, X, ChevronUp, ChevronDown } from 'lucide-solid'
import Button from '../../shared/Button'
import PageHeader from '../../shared/PageHeader'
import TextInput from '../../shared/TextInput'
import { FormLabel } from '../../shared/FormLabel'
import RadioGroup from '../../shared/RadioGroup'
import { getStrictForm } from '../../shared/util'
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
import { useNavigate } from '@solidjs/router'
import PersonaAttributes, { getAttributeMap } from '../../shared/PersonaAttributes'
import AvatarIcon from '../../shared/AvatarIcon'
import { PERSONA_FORMATS } from '../../../common/adapters'
import { getImageData } from '../../store/data/chars'
import Select, { Option } from '../../shared/Select'
import TagInput from '../../shared/TagInput'
import { CultureCodes, defaultCulture } from '../../shared/CultureCodes'
import VoicePicker from './components/VoicePicker'
import { VoiceSettings } from '../../../common/types/texttospeech-schema'
import { AppSchema } from '../../../common/types/schema'
import { downloadCharacterHub } from './ImportCharacter'
import { ImageModal } from '../Chat/ImageModal'
import Loading from '/web/shared/Loading'
import { JSX, For } from 'solid-js'
import { BUNDLED_CHARACTER_BOOK_ID, emptyBookWithEmptyEntry } from '/common/memory'
import { defaultPresets, isDefaultPreset } from '/common/presets'
import { msgsApi } from '/web/store/data/messages'
import { createCharGenTemplate } from '/common/default-preset'
import { toGeneratedCharacter } from './util'
import { Card, SolidCard } from '../../shared/Card'
import { usePane, useRootModal } from '../../shared/hooks'
import Modal from '/web/shared/Modal'
import EditMemoryForm, { EntrySort, getBookUpdate } from '../Memory/EditMemory'
import { ToggleButtons } from '../../shared/Toggle'
import AvatarBuilder from '../../shared/Avatar/Builder'
import { FullSprite } from '/common/types/sprite'
import Slot from '../../shared/Slot'
import { getRandomBody } from '../../asset/sprite'
import AvatarContainer from '../../shared/Avatar/Container'
import { newCharGuard } from './editor'

const options = [
  { id: 'wpp', label: 'W++' },
  { id: 'boostyle', label: 'Boostyle' },
  { id: 'sbf', label: 'SBF' },
  { id: 'text', label: 'Plain Text' },
]

export const CreateCharacterForm: Component<{
  chat?: AppSchema.Chat
  editId?: string
  duplicateId?: string
  import?: string
  children?: JSX.Element
  footer?: (children: JSX.Element) => void
  close?: () => void
}> = (props) => {
  let ref: any
  const nav = useNavigate()
  const isPage = props.close === undefined

  const paneOrPopup = usePane()
  const cancel = () => {
    if (isPage) {
      nav('/character/list')
    } else {
      props.close?.()
    }
  }
  const query = { import: props.import }

  const srcId = createMemo(() => props.editId || props.duplicateId || '')
  const [image, setImage] = createSignal<string | undefined>()

  const [visualType, setVisualType] = createSignal('avatar')
  const [spriteBody, setSpriteBody] = createSignal<FullSprite>()

  const presets = presetStore()
  const user = userStore((s) => s.user)
  const tagState = tagStore()
  const state = characterStore((s) => {
    const edit = s.characters.list.find((ch) => ch._id === srcId())
    setImage(edit?.avatar)
    if (edit?.sprite && !spriteBody()) {
      setSpriteBody(edit.sprite)
      setVisualType(edit.visualType || 'avatar')
    }

    return {
      avatar: s.generate,
      creating: s.creating,
      edit,
      list: s.characters.list,
      loaded: s.characters.loaded,
    }
  })

  const [tokens, setTokens] = createSignal({
    name: 0,
    scenario: 0,
    greeting: 0,
    persona: 0,
    sample: 0,
  })

  const [downloaded, setDownloaded] = createSignal<NewCharacter>()
  const [schema, setSchema] = createSignal<AppSchema.Persona['kind'] | undefined>()
  const [tags, setTags] = createSignal(state.edit?.tags)
  const [bundledBook, setBundledBook] = createSignal(state.edit?.characterBook)
  const [extensions] = createSignal(state.edit?.extensions ?? {})
  const [avatar, setAvatar] = createSignal<File>()
  const [voice, setVoice] = createSignal<VoiceSettings>({ service: undefined })
  const [culture, setCulture] = createSignal(defaultCulture)
  const [creating, setCreating] = createSignal(false)
  const [showBuilder, setShowBuilder] = createSignal(false)

  const [alternateGreetings, setAlternateGreetings] = createSignal(
    state.edit?.alternateGreetings ?? []
  )
  const [showAdvanced, setShowAdvanced] = createSignal(false)
  const toggleShowAdvanced = () => setShowAdvanced(!showAdvanced())
  const advancedVisibility = createMemo(() => (showAdvanced() ? '' : 'hidden'))

  const totalTokens = createMemo(() => {
    const t = tokens()
    return t.name + t.persona + t.sample + t.scenario
  })

  const totalPermanentTokens = createMemo(() => {
    const t = tokens()
    return t.name + t.persona + t.scenario
  })

  const edit = createMemo(() => state.edit)

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

    const prompt = createCharGenTemplate(preset).replace('{{description}}', description)
    setCreating(true)

    msgsApi.basicInference({ prompt, settings: preset }, (err, response) => {
      setCreating(false)
      if (err) {
        toastStore.error(`Could not create character: ${err}`)
        return
      }

      const char = toGeneratedCharacter(response!, description)

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
      setBundledBook(json.characterBook)
      setAlternateGreetings(json.alternateGreetings ?? [])
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
    props.footer?.(footer)
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
    const { appearance } = getStrictForm(ref, { appearance: 'string' })
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
      characterStore.generateAvatar(user!, appearance || persona)
    } catch (ex: any) {
      toastStore.error(ex.message)
    }
  }

  const onSubmit = (ev: Event) => {
    const opts: PayloadOpts = {
      tags: tags(),

      visualType: visualType(),
      avatar: state.avatar.blob || avatar(),
      sprite: spriteBody(),

      altGreetings: alternateGreetings(),
      characterBook: bundledBook(),
      extensions: extensions(),
      originalAvatar: state.edit?.avatar,
      voice: voice(),
    }

    const payload = getPayload(ref, opts)

    if (props.editId) {
      characterStore.editCharacter(props.editId, payload, () => {
        if (isPage) {
          nav(`/character/${props.editId}/chats`)
        } else if (paneOrPopup() === 'popup') {
          props.close?.()
        }
      })
    } else {
      characterStore.createCharacter(payload, (result) => nav(`/character/${result._id}/chats`))
    }
  }

  const footer = (
    <>
      <Button onClick={cancel} schema="secondary">
        <X />
        {props.close ? 'Close' : 'Cancel'}
      </Button>
      <Button onClick={onSubmit} disabled={state.creating}>
        <Save />
        {props.editId ? 'Update' : 'Create'}
      </Button>
    </>
  )

  const showWarning = createMemo(
    () => !!props.chat?.overrides && props.chat.characterId === props.editId
  )

  let spriteRef: any

  return (
    <>
      <Show when={isPage || paneOrPopup() === 'pane'}>
        <PageHeader
          title={`${props.editId ? 'Edit' : props.duplicateId ? 'Copy' : 'Create'} a Character`}
          subtitle={
            <div class="whitespace-normal">
              <em>
                {totalTokens()} tokens, {totalPermanentTokens()} permanent
              </em>
            </div>
          }
        />
      </Show>
      <form class="text-base" onSubmit={onSubmit} ref={ref}>
        <div class="flex flex-col gap-4">
          <Show when={!isPage}>
            <div> {props.children} </div>
          </Show>

          <Show when={showWarning()}>
            <SolidCard bg="orange-600">
              <b>Warning!</b> Your chat currently overrides your character definitions. These
              changes won't affect your current chat until you disable them in the "Edit Chat" menu.
            </SolidCard>
          </Show>

          <div class={`flex grow flex-col justify-between gap-4 pl-2 pr-3 `}>
            <Show when={!isPage && paneOrPopup() === 'popup'}>
              <div>
                <em>
                  ({totalTokens()} tokens, {totalPermanentTokens()} permanent)
                </em>
              </div>
            </Show>
            <Card>
              <TextInput
                fieldName="name"
                required
                label="Character Name"
                placeholder=""
                value={downloaded()?.name || state.edit?.name}
                tokenCount={(v) => setTokens((prev) => ({ ...prev, name: v }))}
              />
            </Card>

            <Card class="flex w-full flex-col">
              <FormLabel
                label="Description / Creator's notes"
                helperText={
                  <div class="flex flex-col">
                    <span>
                      A description, label, or notes for your character. This is will not influence
                      your character in any way.
                    </span>
                    <Show when={canPopulatFields()}>
                      <span>
                        To use OpenAI to generate a character, describe the character below then
                        click <b>Generate</b>. It can take 30-60 seconds.
                      </span>
                    </Show>
                  </div>
                }
              />
              <div class="flex w-full flex-col gap-2 sm:flex-row">
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
            </Card>

            <Card>
              <TagInput
                availableTags={tagState.tags.map((t) => t.tag)}
                value={tags()}
                fieldName="tags"
                label="Tags"
                helperText="Used to help you organize and filter your characters."
                onSelect={setTags}
              />
            </Card>

            <Card class="flex w-full flex-col gap-4 sm:flex-row">
              <Switch>
                <Match when={visualType() === 'sprite'}>
                  <div class="flex h-24 w-full justify-center sm:w-24" ref={spriteRef}>
                    <AvatarContainer body={spriteBody()} container={spriteRef} />
                  </div>
                </Match>
                <Match when={!state.avatar.loading}>
                  <div
                    class="flex items-baseline justify-center"
                    style={{ cursor: state.avatar.image || image() ? 'pointer' : 'unset' }}
                    onClick={() => settingStore.showImage(state.avatar.image || image())}
                  >
                    <AvatarIcon
                      format={{ corners: 'sm', size: '3xl' }}
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
                <ToggleButtons
                  items={[
                    { value: 'avatar', label: 'Avatar' },
                    { value: 'sprite', label: 'Sprite' },
                  ]}
                  onChange={(opt) => {
                    setVisualType(opt.value)
                  }}
                  selected={visualType()}
                />

                <Switch>
                  <Match when={visualType() === 'avatar'}>
                    <FileInput
                      class="w-full"
                      fieldName="avatar"
                      label="Avatar"
                      accept="image/png,image/jpeg,image/apng"
                      onUpdate={updateFile}
                    />
                    <div class="flex w-full flex-col gap-2 sm:flex-row">
                      <TextInput
                        isMultiline
                        parentClass="w-full"
                        fieldName="appearance"
                        helperText={`Leave the prompt empty to use your character's W++ "looks" / "appearance" attributes`}
                        placeholder="Appearance"
                        value={downloaded()?.appearance || state.edit?.appearance}
                      />
                      <Button class="w-fit self-end" onClick={generateAvatar}>
                        Generate
                      </Button>
                    </div>
                  </Match>
                  <Match when={true}>
                    <Button class="w-fit" onClick={() => setShowBuilder(true)}>
                      Open Character Builder
                    </Button>
                  </Match>
                </Switch>
                <div></div>
              </div>
            </Card>

            <Card>
              <TextInput
                fieldName="scenario"
                label="Scenario"
                helperText="The current circumstances and context of the conversation and the characters."
                placeholder="E.g. {{char}} is in their office working. {{user}} opens the door and walks in."
                value={downloaded()?.scenario || state.edit?.scenario}
                isMultiline
                tokenCount={(v) => setTokens((prev) => ({ ...prev, scenario: v }))}
              />
            </Card>
            <Card class="flex flex-col gap-3">
              <TextInput
                isMultiline
                fieldName="greeting"
                label="Greeting"
                helperText="The first message from your character. It is recommended to provide a lengthy first message to encourage the character to give longer responses."
                placeholder={
                  "E.g. *I smile as you walk into the room* Hello, {{user}}! I can't believe it's lunch time already! Where are we going?"
                }
                value={downloaded()?.greeting || state.edit?.greeting}
                class="h-60"
                tokenCount={(v) => setTokens((prev) => ({ ...prev, greeting: v }))}
              />
              <AlternateGreetingsInput
                greetings={alternateGreetings()}
                setGreetings={setAlternateGreetings}
              />
            </Card>
            <Card class="flex flex-col gap-3">
              <div>
                <FormLabel
                  label="Persona Schema"
                  helperText={
                    <>
                      <p>If you do not know what this mean, you can leave this as-is.</p>
                      <p class="font-bold">
                        WARNING: "Plain Text" and "Non-Plain Text" schemas are not compatible.
                        Changing between them will cause data loss.
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
              <Show when={!props.editId && !props.duplicateId}>
                <PersonaAttributes
                  value={downloaded()?.persona.attributes}
                  plainText={schema() === 'text' || schema() === undefined}
                  schema={schema()}
                  tokenCount={(v) => setTokens((prev) => ({ ...prev, persona: v }))}
                  form={ref}
                />
              </Show>

              <Show when={(props.editId || props.duplicateId) && state.edit}>
                <PersonaAttributes
                  value={downloaded()?.persona.attributes || state.edit?.persona.attributes}
                  plainText={schema() === 'text'}
                  schema={schema()}
                  tokenCount={(v) => setTokens((prev) => ({ ...prev, persona: v }))}
                  form={ref}
                />
              </Show>
            </Card>
            <Card>
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
                tokenCount={(v) => setTokens((prev) => ({ ...prev, sample: v }))}
              />
            </Card>
            <h2
              class={`mt-3 flex cursor-pointer gap-3 text-lg font-bold ${
                showAdvanced() ? '' : 'mb-12'
              }`}
              onClick={toggleShowAdvanced}
            >
              <div class="relative top-[2px] inline-block">
                {showAdvanced() ? <ChevronUp /> : <ChevronDown />}
              </div>
              Advanced options
            </h2>
            <div class={`flex flex-col gap-3 ${advancedVisibility()}`}>
              <Card class="flex flex-col gap-3">
                <TextInput
                  isMultiline
                  fieldName="systemPrompt"
                  label="Character System Prompt (optional)"
                  helperText={
                    <span>
                      {`System prompt to bundle with your character. You can use the {{original}} placeholder to include the user's own system prompt, if you want to supplement it instead of replacing it.`}
                    </span>
                  }
                  placeholder="Enter roleplay mode. You will write {{char}}'s next reply in a dialogue between {{char}} and {{user}}. Do not decide what {{user}} says or does. Use Internet roleplay style, e.g. no quotation marks, and write user actions in italic in third person like: *example*. You are allowed to use markdown. Be proactive, creative, drive the plot and conversation forward. Write at least one paragraph, up to four. Always stay in character. Always keep the conversation going. (Repetition is highly discouraged)"
                  value={downloaded()?.systemPrompt || state.edit?.systemPrompt}
                />
                <TextInput
                  isMultiline
                  fieldName="postHistoryInstructions"
                  label="Post-conversation History Instructions (optional)"
                  helperText={
                    <span>
                      {`Prompt to bundle with your character, used at the bottom of the prompt. You can use the {{original}} placeholder to include the user's UJB, if you want to supplement it instead of replacing it.`}
                    </span>
                  }
                  placeholder="Write at least four paragraphs."
                  value={
                    downloaded()?.postHistoryInstructions || state.edit?.postHistoryInstructions
                  }
                />
              </Card>
              <Card>
                <MemoryBookPicker setBundledBook={setBundledBook} bundledBook={bundledBook()} />
              </Card>
              <Card>
                <TextInput
                  fieldName="creator"
                  label="Creator (optional)"
                  placeholder="e.g. John1990"
                  value={downloaded()?.creator || state.edit?.creator}
                />
              </Card>
              <Card>
                <TextInput
                  fieldName="characterVersion"
                  label="Character Version (optional)"
                  placeholder="any text e.g. 1, 2, v1, v1fempov..."
                  value={downloaded()?.characterVersion || state.edit?.characterVersion}
                />
              </Card>
              <Card class="flex flex-col gap-3">
                <h4 class="text-md font-bold">Voice</h4>
                <div>
                  <VoicePicker value={voice()} culture={culture()} onChange={setVoice} />
                </div>
                <Select
                  fieldName="culture"
                  label="Language"
                  helperText={`The language this character speaks and understands.${
                    culture().startsWith('en') ?? true
                      ? ''
                      : ' NOTE: You need to also translate the preset gaslight to use a non-english language.'
                  }`}
                  value={culture()}
                  items={CultureCodes}
                  onChange={(option) => setCulture(option.value)}
                />
              </Card>
            </div>

            <Show when={!props.close}>
              <div class="flex w-full justify-end gap-2">{footer}</div>
            </Show>
          </div>
        </div>
      </form>
      <SpriteModal
        body={spriteBody()}
        onChange={(body) => {
          setSpriteBody(body)
          setShowBuilder(false)
        }}
        show={showBuilder()}
        close={() => setShowBuilder(false)}
      />
      <ImageModal />
    </>
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

const SpriteModal: Component<{
  body?: FullSprite
  onChange: (body: FullSprite) => void
  show: boolean
  close: () => void
}> = (props) => {
  let ref: any

  const [original, setOriginal] = createSignal(props.body)
  const [body, setBody] = createSignal(props.body || getRandomBody())

  createEffect(() => {
    if (props.body && !original()) {
      setOriginal(props.body)
    }
  })

  const handleChange = () => {
    props.onChange(body())
  }

  useRootModal({
    id: 'sprite-modal',
    element: (
      <Modal
        show={props.show}
        close={props.close}
        title="Character Designer"
        fixedHeight
        maxWidth="half"
        footer={
          <>
            <Button onClick={() => props.onChange(original()!)} schema="secondary">
              Cancel
            </Button>
            <Button onClick={handleChange}>Confirm</Button>
          </>
        }
      >
        <Slot slot="mobile" />
        <div class="h-[28rem] w-full text-sm sm:h-[42rem]" ref={ref}>
          <AvatarBuilder body={body()} onChange={(body) => setBody(body)} bounds={ref} noHeader />
        </div>
      </Modal>
    ),
  })

  return null
}

const MemoryBookPicker: Component<{
  bundledBook: AppSchema.MemoryBook | undefined
  setBundledBook: (newVal: AppSchema.MemoryBook | undefined) => void
}> = (props) => {
  const memory = memoryStore()
  const [isModalShown, setIsModalShown] = createSignal(false)
  const [entrySort, setEntrySort] = createSignal<EntrySort>('creationDate')
  const updateEntrySort = (item: Option<string>) => {
    if (item.value === 'creationDate' || item.value === 'alpha') {
      setEntrySort(item.value)
    }
  }

  const NONE_VALUE = '__none_character_book__'
  const internalMemoryBookOptions = createMemo(() => [
    { label: 'Import Memory Book', value: NONE_VALUE },
    ...memory.books.list.map((book) => ({ label: book.name, value: book._id })),
  ])
  const pickInternalMemoryBook = (option: Option) => {
    const newBook = memory.books.list.find((book) => book._id === option.value)
    props.setBundledBook(newBook ? { ...newBook, _id: BUNDLED_CHARACTER_BOOK_ID } : undefined)
  }
  const initBlankCharacterBook = () => {
    props.setBundledBook(emptyBookWithEmptyEntry())
  }
  const deleteBook = () => {
    props.setBundledBook(undefined)
  }
  const ModalFooter = () => (
    <>
      <Button schema="secondary" onClick={() => setIsModalShown(false)}>
        Close
      </Button>
      <Button type="submit">
        <Save />
        Save Character Book
      </Button>
    </>
  )
  const onSubmitCharacterBookChanges = (ev: Event) => {
    ev.preventDefault()
    const update = getBookUpdate(ev)
    if (props.bundledBook) {
      props.setBundledBook({ ...props.bundledBook, ...update })
    }
    setIsModalShown(false)
  }

  const BookModal = (
    <Modal
      title="Chat Memory"
      show={isModalShown()}
      close={() => setIsModalShown(false)}
      footer={<ModalFooter />}
      onSubmit={onSubmitCharacterBookChanges}
      maxWidth="half"
      fixedHeight
    >
      <div class="text-sm">
        <EditMemoryForm
          hideSave
          book={props.bundledBook!}
          entrySort={entrySort()}
          updateEntrySort={updateEntrySort}
        />
      </div>
    </Modal>
  )

  useRootModal({ id: 'memoryBook', element: BookModal })

  return (
    <div>
      <h4 class="text-lg">Character Book</h4>
      <Show when={!props.bundledBook}>
        <span class="text-sm"> This character doesn't have a Character Book. </span>
        <div class="flex flex-col gap-3 sm:flex-row">
          <Select
            fieldName="memoryBook"
            value={NONE_VALUE}
            items={internalMemoryBookOptions()}
            onChange={pickInternalMemoryBook}
          />
          <Button onClick={initBlankCharacterBook}>Create New Book</Button>
        </div>
      </Show>
      <Show when={props.bundledBook}>
        <span class="text-sm">This character has a Character Book.</span>
        <div class="mt-2 flex gap-3">
          <Button onClick={() => setIsModalShown(true)}>Edit Book</Button>
          <Button onClick={deleteBook}>Delete Book</Button>
        </div>
      </Show>
    </div>
  )
}

type PayloadOpts = {
  tags: string[] | undefined
  voice: VoiceSettings

  visualType: string
  avatar: File | undefined
  sprite: FullSprite | undefined

  altGreetings: string[] | undefined
  characterBook: AppSchema.MemoryBook | undefined
  extensions: Record<string, any>
  originalAvatar: string | undefined
}

function getPayload(ev: Event, opts: PayloadOpts) {
  const body = getStrictForm(ev, newCharGuard)
  const attributes = getAttributeMap(ev)

  const persona = {
    kind: body.kind,
    attributes,
  }

  const payload = {
    name: body.name,
    description: body.description,
    culture: body.culture,
    tags: opts.tags,
    scenario: body.scenario,
    appearance: body.appearance,
    visualType: opts.visualType,
    avatar: opts.avatar ?? (null as any),
    sprite: opts.sprite ?? (null as any),
    greeting: body.greeting,
    sampleChat: body.sampleChat,
    persona,
    originalAvatar: opts.originalAvatar,
    voice: opts.voice,

    // New fields start here
    systemPrompt: body.systemPrompt ?? '',
    postHistoryInstructions: body.postHistoryInstructions ?? '',
    alternateGreetings: opts.altGreetings ?? [],
    characterBook: opts.characterBook,
    creator: body.creator ?? '',
    extensions: opts.extensions,
    characterVersion: body.characterVersion ?? '',
  }

  return payload
}
