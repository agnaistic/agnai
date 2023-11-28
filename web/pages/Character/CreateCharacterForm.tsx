import {
  Component,
  createEffect,
  createMemo,
  createSignal,
  Match,
  onMount,
  Show,
  Switch,
} from 'solid-js'
import { MinusCircle, Plus, Save, X, Import, Download, HelpCircle } from 'lucide-solid'
import Button from '../../shared/Button'
import PageHeader from '../../shared/PageHeader'
import TextInput from '../../shared/TextInput'
import { FormLabel } from '../../shared/FormLabel'
import FileInput, { FileInputResult } from '../../shared/FileInput'
import { characterStore, tagStore, toastStore, memoryStore, chatStore } from '../../store'
import { useNavigate } from '@solidjs/router'
import PersonaAttributes from '../../shared/PersonaAttributes'
import AvatarIcon from '../../shared/AvatarIcon'
import { getImageData } from '../../store/data/chars'
import Select, { Option } from '../../shared/Select'
import TagInput from '../../shared/TagInput'
import { CultureCodes } from '../../shared/CultureCodes'
import VoicePicker from './components/VoicePicker'
import { AppSchema } from '../../../common/types/schema'
import Loading from '/web/shared/Loading'
import { JSX, For } from 'solid-js'
import { BUNDLED_CHARACTER_BOOK_ID, emptyBookWithEmptyEntry } from '/common/memory'
import { Card, Pill, SolidCard, TitleCard } from '../../shared/Card'
import { usePane, useRootModal } from '../../shared/hooks'
import Modal from '/web/shared/Modal'
import EditMemoryForm, { EntrySort, getBookUpdate } from '../Memory/EditMemory'
import { Toggle, ToggleButtons } from '../../shared/Toggle'
import AvatarBuilder from '../../shared/Avatar/Builder'
import { FullSprite } from '/common/types/sprite'
import { getRandomBody } from '../../asset/sprite'
import AvatarContainer from '../../shared/Avatar/Container'
import { CharEditor, useCharEditor } from './editor'
import { downloadCharacterHub, jsonToCharacter } from './port'
import { DownloadModal } from './DownloadModal'
import ImportCharacterModal from './ImportCharacter'
import { GenField } from './generate-char'
import Tabs, { useTabs } from '/web/shared/Tabs'
import RangeInput from '/web/shared/RangeInput'
import { rootModalStore } from '/web/store/root-modal'
import { getAssetUrl } from '/web/shared/util'

const formatOptions = [
  { value: 'attributes', label: 'Attributes (Key: value)' },
  { value: 'text', label: 'Plain Text' },
]

const backupFormats: any = {
  sbf: { value: 'sbf', label: 'SBF' },
  wpp: { value: 'wpp', label: 'W++' },
  boostyle: { value: 'boostyle', label: 'Boostyle' },
}

export const CreateCharacterForm: Component<{
  chat?: AppSchema.Chat
  editId?: string
  duplicateId?: string
  import?: string
  children?: JSX.Element
  temp?: boolean
  noTitle?: boolean
  footer?: (children: JSX.Element) => void
  close?: () => void
  onSuccess?: (char: AppSchema.Character) => void
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
  const [forceNew, setForceNew] = createSignal<boolean>(false)

  const srcId = createMemo(() => props.editId || props.duplicateId || '')
  const [image, setImage] = createSignal<string | undefined>()

  const editor = useCharEditor()

  const tagState = tagStore()
  const state = characterStore((s) => {
    const edit = s.editing

    return {
      avatar: s.generate,
      creating: s.creating,
      edit: forceNew() ? undefined : edit,
      list: s.characters.list,
      loaded: s.characters.loaded,
    }
  })

  const [imgUrl, setImageUrl] = createSignal<string>()

  const [tokens, setTokens] = createSignal({
    name: 0,
    scenario: 0,
    greeting: 0,
    persona: 0,
    sample: 0,
  })

  const [genService, setGenService] = createSignal<string>(editor.genOptions()[0]?.value || '')
  const [creating, setCreating] = createSignal(false)
  const [showBuilder, setShowBuilder] = createSignal(false)
  const [converted, setConverted] = createSignal<AppSchema.Character>()
  const [showImport, setImport] = createSignal(false)

  const personaFormats = createMemo(() => {
    const options = formatOptions.slice()
    if (editor.state.personaKind in backupFormats) {
      options.push(backupFormats[editor.state.personaKind])
    }
    return options
  })

  const totalTokens = createMemo(() => {
    const t = tokens()
    return t.name + t.persona + t.sample + t.scenario
  })

  const totalPermanentTokens = createMemo(() => {
    const t = tokens()
    return t.name + t.persona + t.scenario
  })

  const generateCharacter = async (fields?: GenField[]) => {
    setCreating(true)
    try {
      await editor.generateCharacter(genService(), fields)
    } finally {
      setCreating(false)
    }
  }

  onMount(async () => {
    characterStore.clearGeneratedAvatar()
    characterStore.clearCharacter()

    if (srcId()) {
      characterStore.getCharacter(srcId(), props.chat)
    }

    /* Character importing from CharacterHub */
    if (!query.import) return
    try {
      const { file, json } = await downloadCharacterHub(query.import)
      const imageData = await getImageData(file)
      const char = jsonToCharacter(json)
      editor.load(char)
      editor.update({
        book: json.characterBook,
        alternateGreetings: json.alternateGreetings || [],
        avatar: file,
        personaKind: 'text',
      })

      setImage(imageData)
      toastStore.success(`Successfully downloaded from Character Hub`)
    } catch (ex: any) {
      toastStore.error(`Character Hub download failed: ${ex.message}`)
    }
  })

  createEffect(() => {
    if (!ref) return

    // We know we're waiting for a character to edit, so let's just wait
    if (!state.edit && srcId()) return

    // If this is our first pass: load something no matter what
    if (!editor.original()) {
      if (!srcId()) {
        // editor.reset(ref)
        return
      }

      // We have a `srcId`, we need to wait to receive the character we're editing
      if (!state.edit) return

      editor.load(state.edit)
      setImage(state.edit?.avatar)
      return
    }

    // This is a subsequent pass - we already have state
    // We want to avoid unnecessarily clearing/reseting state due to a websocket reconnect

    if (!state.edit) return
    if (editor.state.editId !== state.edit._id && state.edit._id === srcId()) {
      editor.update('editId', srcId())
      editor.load(state.edit)
      setImage(state.edit?.avatar)
      return
    }
  })

  createEffect(() => {
    tagStore.updateTags(state.list)
    props.footer?.(footer)
  })

  const updateFile = async (files: FileInputResult[]) => {
    if (!files.length) {
      editor.update('avatar', undefined)
      setImage(state.edit?.avatar)
      return
    }

    const file = files[0].file
    editor.update('avatar', file)
    const data = await getImageData(file)
    setImage(data)
  }

  const onSubmit = async (ev: Event) => {
    const payload = editor.payload()
    payload.avatar = editor.state.avatar

    if (props.temp && props.chat) {
      if (editor.state.avatar) {
        const data = await getImageData(editor.state.avatar)
        payload.avatar = data
      }
      chatStore.upsertTempCharacter(props.chat._id, { ...payload, _id: props.editId }, (result) => {
        props.onSuccess?.(result)
        if (paneOrPopup() === 'popup') props.close?.()
      })
    } else if (!forceNew() && props.editId) {
      characterStore.editCharacter(props.editId, payload, () => {
        if (isPage) {
          nav(`/character/${props.editId}/chats`)
        } else if (paneOrPopup() === 'popup') {
          props.close?.()
        }
      })
    } else {
      characterStore.createCharacter(payload, (result) => {
        setForceNew(false)
        if (isPage) nav(`/character/${result._id}/chats`)
      })
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
        {props.editId && !forceNew() ? 'Update' : 'Create'}
      </Button>
    </>
  )

  const showWarning = createMemo(
    () => !!props.chat?.overrides && props.chat.characterId === props.editId
  )

  const tabs = useTabs(['Basic', 'Advanced'], 0)

  let spriteRef: any

  return (
    <>
      <Show when={!props.noTitle && (isPage || paneOrPopup() === 'pane')}>
        <PageHeader
          title={`${
            forceNew() ? 'Create' : props.editId ? 'Edit' : props.duplicateId ? 'Copy' : 'Create'
          } a Character`}
          subtitle={
            <div class="whitespace-normal">
              <em>
                {totalTokens()} tokens, {totalPermanentTokens()} permanent
              </em>
            </div>
          }
        />
      </Show>
      <form
        class="relative text-base"
        onSubmit={onSubmit}
        ref={(form) => {
          ref = form
          editor.prepare(form)
        }}
      >
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

          <div class={`flex grow flex-col justify-between gap-2 pl-2 pr-3 `}>
            <Show when={!isPage && paneOrPopup() === 'popup'}>
              <div>
                <em>
                  ({totalTokens()} tokens, {totalPermanentTokens()} permanent)
                </em>
              </div>
            </Show>

            <Show when={props.temp}>
              <TitleCard type="premium">
                You are {props.editId ? 'editing' : 'creating'} a temporary character. A temporary
                character exist within your current chat only.
              </TitleCard>
            </Show>

            <div class="flex justify-end gap-2 text-[1em]">
              <Button onClick={() => setImport(true)}>
                <Import /> Import
              </Button>

              <Button onClick={() => setConverted(editor.convert())}>
                <Download /> Export
              </Button>

              <Show when={state.edit}>
                <Button
                  onClick={() => {
                    setForceNew(true)
                    editor.clear()
                  }}
                >
                  <Plus />
                  New
                </Button>
              </Show>
            </div>

            <Tabs select={tabs.select} selected={tabs.selected} tabs={tabs.tabs} />

            <div class="flex flex-col gap-2" classList={{ hidden: tabs.current() !== 'Basic' }}>
              <Button
                size="sm"
                class="w-fit"
                onClick={() => {
                  rootModalStore.info(
                    'AI Character Generation',
                    <>
                      1. Fill out the <Pill small>Description</Pill> field
                      <br />
                      2. Select the Service you wish to use
                      <br />
                      3. Click{' '}
                      <Pill inverse type="hl" small>
                        Generate
                      </Pill>
                      &nbsp;- It may take 30-60 seconds to generate.
                      <br />
                      4. Adjust the <Pill small>Description</Pill> and click{' '}
                      <Pill type="hl" inverse small>
                        Regenerate
                      </Pill>
                      &nbsp;to regenerate a specific field.
                    </>
                  )
                }}
              >
                <HelpCircle size={16} /> AI Character Generation
              </Button>
              <Card>
                <TextInput
                  fieldName="name"
                  required
                  label="Character Name"
                  placeholder=""
                  value={editor.state.name}
                  tokenCount={(v) => setTokens((prev) => ({ ...prev, name: v }))}
                />
              </Card>

              <Card class="flex w-full flex-col">
                <FormLabel
                  label="Description / Creator's notes"
                  helperText={
                    <div class="flex flex-col">
                      <span>
                        A description, label, or notes for your character. This is will not
                        influence your character in any way.
                      </span>
                    </div>
                  }
                />
                <div class="flex w-full flex-col gap-2">
                  <TextInput
                    isMultiline
                    fieldName="description"
                    parentClass="w-full"
                    value={editor.state.description}
                  />
                  <Show when={editor.canGuidance}>
                    <div class="flex justify-end gap-2 sm:justify-start">
                      <Select
                        fieldName="chargenService"
                        items={editor.genOptions()}
                        onChange={(item) => setGenService(item.value)}
                      />
                      <Button onClick={() => generateCharacter()} disabled={creating()}>
                        {creating() ? 'Generating...' : 'Generate'}
                      </Button>
                    </div>
                  </Show>
                </div>
              </Card>

              <Card>
                <TagInput
                  availableTags={tagState.tags.map((t) => t.tag)}
                  value={editor.state.tags}
                  fieldName="tags"
                  label="Tags"
                  helperText="Used to help you organize and filter your characters."
                  onSelect={(tags) => editor.update({ tags })}
                />
              </Card>

              <Card class="flex w-full flex-col gap-4 sm:flex-row">
                <div class="flex flex-col items-center gap-1">
                  <Switch>
                    <Match when={editor.state.visualType === 'sprite'}>
                      <div class="flex h-24 w-full justify-center sm:w-24" ref={spriteRef}>
                        <AvatarContainer body={editor.state.sprite} container={spriteRef} />
                      </div>
                    </Match>
                    <Match when={!state.avatar.loading}>
                      <div
                        class="flex items-baseline justify-center"
                        style={{ cursor: state.avatar.image || image() ? 'pointer' : 'unset' }}
                        onClick={() => setImageUrl(editor.avatar() || image())}
                      >
                        <AvatarIcon
                          format={{ corners: 'sm', size: '3xl' }}
                          avatarUrl={editor.avatar() || image()}
                        />
                      </div>
                    </Match>
                    <Match when={state.avatar.loading}>
                      <div class="flex w-[80px] items-center justify-center">
                        <Loading />
                      </div>
                    </Match>
                  </Switch>
                  <Button size="pill" class="w-fit" onClick={() => editor.createAvatar()}>
                    Generate Image
                  </Button>
                </div>
                <div class="flex w-full flex-col gap-2">
                  <ToggleButtons
                    items={[
                      { value: 'avatar', label: 'Avatar' },
                      { value: 'sprite', label: 'Sprite' },
                    ]}
                    onChange={(opt) => editor.update('visualType', opt.value)}
                    selected={editor.state.visualType}
                  />

                  <Switch>
                    <Match when={editor.state.visualType === 'avatar'}>
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
                          label={
                            <>
                              <Regenerate
                                fields={['appearance']}
                                service={genService()}
                                editor={editor}
                                allowed={editor.canGuidance}
                              />
                            </>
                          }
                          helperText={`Leave the prompt empty to use your character's persona "looks" / "appearance" attributes`}
                          placeholder="Appearance Prompt (used for Avatar Generation)"
                          value={editor.state.appearance}
                        />
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
                  label={
                    <>
                      Scenario{' '}
                      <Regenerate
                        fields={['scenario']}
                        service={genService()}
                        editor={editor}
                        allowed={editor.canGuidance}
                      />
                    </>
                  }
                  helperText="The current circumstances and context of the conversation and the characters."
                  placeholder="E.g. {{char}} is in their office working. {{user}} opens the door and walks in."
                  value={editor.state.scenario}
                  isMultiline
                  tokenCount={(v) => setTokens((prev) => ({ ...prev, scenario: v }))}
                />
              </Card>
              <Card class="flex flex-col gap-3">
                <TextInput
                  isMultiline
                  fieldName="greeting"
                  label={
                    <>
                      Greeting{' '}
                      <Regenerate
                        fields={['greeting']}
                        service={genService()}
                        editor={editor}
                        allowed={editor.canGuidance}
                      />
                    </>
                  }
                  helperText="The first message from your character. It is recommended to provide a lengthy first message to encourage the character to give longer responses."
                  placeholder={
                    "E.g. *I smile as you walk into the room* Hello, {{user}}! I can't believe it's lunch time already! Where are we going?"
                  }
                  value={editor.state.greeting}
                  class="h-60"
                  tokenCount={(v) => setTokens((prev) => ({ ...prev, greeting: v }))}
                />
                <AlternateGreetingsInput
                  greetings={editor.state.alternateGreetings}
                  setGreetings={(next) => editor.update({ alternateGreetings: next })}
                />
              </Card>
              <Card class="flex flex-col gap-3">
                <div>
                  <FormLabel
                    label={
                      <div class="flex items-center gap-1">
                        Persona Schema{' '}
                        <Regenerate
                          fields={['personality', 'behaviour']}
                          service={genService()}
                          editor={editor}
                          allowed={editor.canGuidance}
                        />{' '}
                      </div>
                    }
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
                  <Select
                    fieldName="kind"
                    items={personaFormats()}
                    value={editor.state.personaKind}
                    onChange={(kind) => editor.update({ personaKind: kind.value as any })}
                  />
                </div>

                <PersonaAttributes
                  value={editor.state.persona.attributes}
                  plainText={editor.state.personaKind === 'text'}
                  schema={editor.state.personaKind}
                  tokenCount={(v) => setTokens((prev) => ({ ...prev, persona: v }))}
                  form={ref}
                />
              </Card>
              <Card>
                <TextInput
                  isMultiline
                  fieldName="sampleChat"
                  label={
                    <>
                      Sample Conversation{' '}
                      <Regenerate
                        fields={['example1', 'example2', 'example3']}
                        service={genService()}
                        editor={editor}
                        allowed={editor.canGuidance}
                      />
                    </>
                  }
                  helperText={
                    <span>
                      Example chat between you and the character. This section is very important for
                      teaching your character should speak.
                    </span>
                  }
                  placeholder="{{char}}: *smiles and waves back* Hello! I'm so happy you're here!"
                  value={editor.state.sampleChat}
                  tokenCount={(v) => setTokens((prev) => ({ ...prev, sample: v }))}
                />
              </Card>
            </div>

            <div
              class={`flex flex-col gap-2`}
              classList={{ hidden: tabs.current() !== 'Advanced' }}
            >
              <Card class="flex flex-col gap-2">
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
                  value={editor.state.systemPrompt}
                />
                <TextInput
                  isMultiline
                  fieldName="postHistoryInstructions"
                  label="Post-conversation History Instructions (optional)"
                  helperText={
                    <span>
                      {`Prompt to bundle with your character, used at the bottom of the prompt. You can use the {{original}} placeholder to include the user's jailbreak (UJB), if you want to supplement it instead of replacing it.`}
                    </span>
                  }
                  placeholder="Write at least four paragraphs."
                  value={editor.state.postHistoryInstructions}
                />
                <TextInput
                  isMultiline
                  class="min-h-[80px]"
                  fieldName="insertPrompt"
                  label="Insert / Depth Prompt"
                  helperMarkdown={`A.k.a. Author's note. Prompt to be placed near the bottom of the chat history, **Insert Depth** messages from the bottom.`}
                  placeholder={`E.g. ### Instruction: Write like James Joyce.`}
                  value={editor.state.insert?.prompt}
                />
                <RangeInput
                  fieldName="insertDepth"
                  label="Insert Depth"
                  helperText={
                    <>
                      The number of messages that should exist below the <b>Insert Prompt</b>.
                      Between 1 and 5 is recommended.
                    </>
                  }
                  min={0}
                  max={10}
                  step={1}
                  value={editor.state.insert?.depth ?? 3}
                />
              </Card>
              <Card>
                <MemoryBookPicker
                  setBundledBook={(book) => editor.update('book', book)}
                  bundledBook={editor.state.book}
                />
              </Card>
              <Card>
                <TextInput
                  fieldName="creator"
                  label="Creator (optional)"
                  placeholder="e.g. John1990"
                  value={editor.state.creator}
                />
              </Card>
              <Card>
                <TextInput
                  fieldName="characterVersion"
                  label="Character Version (optional)"
                  placeholder="any text e.g. 1, 2, v1, v1fempov..."
                  value={editor.state.characterVersion}
                />
              </Card>
              <Card class="flex flex-col gap-3">
                <h4 class="text-md font-bold">Voice</h4>
                <Toggle
                  fieldName="voiceDisabled"
                  value={editor.state.voiceDisabled}
                  label="Disable Character's Voice"
                  helperText="Toggle on to disable this character from automatically speaking"
                />
                <div>
                  <VoicePicker
                    value={editor.state.voice}
                    culture={editor.state.culture}
                    onChange={(voice) => editor.update('voice', voice)}
                  />
                </div>
                <Select
                  fieldName="culture"
                  label="Language"
                  helperText={`The language this character speaks and understands.${
                    editor.state.culture.startsWith('en') ?? true
                      ? ''
                      : ' NOTE: You need to also translate the preset gaslight to use a non-english language.'
                  }`}
                  value={editor.state.culture}
                  items={CultureCodes}
                  onChange={(option) => editor.update('culture', option.value)}
                />
              </Card>
            </div>

            <Show when={!props.close}>
              <div class="flex w-full justify-end gap-2">{footer}</div>
            </Show>
          </div>
        </div>
      </form>
      <Show when={showBuilder()}>
        <SpriteModal
          body={editor.state.sprite}
          onChange={(body) => {
            editor.update('sprite', body)
            setShowBuilder(false)
          }}
          show={showBuilder()}
          close={() => setShowBuilder(false)}
        />
      </Show>

      <Show when={converted()}>
        <DownloadModal
          show
          close={() => setConverted(undefined)}
          char={converted()!}
          charId={converted()!._id}
        />
      </Show>
      <ImportCharacterModal
        show={showImport()}
        close={() => setImport(false)}
        onSave={(char, imgs) => {
          editor.load(char[0])
          editor.update('avatar', imgs[0])
          setImage(imgs[0] as any)
          setImport(false)
        }}
        single
      />

      <AvatarModal url={imgUrl()} close={() => setImageUrl('')} />
    </>
  )
}

const Regenerate: Component<{
  service: string
  fields: GenField[]
  editor: CharEditor
  allowed: boolean
  children?: any
}> = (props) => {
  return (
    <Switch>
      <Match when={!props.allowed}>{null}</Match>
      {/* <Match when={props.editor.generating()}>
        <span
          class="cursor-not-allowed text-[var(--hl-700)]"
          onClick={() => props.editor.generateCharacter(props.service, props.fields)}
        >
          Regenerating...
        </span>
      </Match> */}
      <Match when={props.allowed}>
        {/* <span
          class="link"
          onClick={() => props.editor.generateCharacter(props.service, props.fields)
        >
          Regenerate
        </span> */}

        <Button
          size="pill"
          class="inline-block"
          onClick={() => props.editor.generateCharacter(props.service, props.fields)}
          disabled={props.editor.generating()}
        >
          {props.children || 'Regenerate'}
        </Button>
      </Match>
    </Switch>
  )
}

const AvatarModal: Component<{ url?: string; close: () => void }> = (props) => {
  rootModalStore.addModal({
    id: 'char-avatar-modal',
    element: (
      <Modal show={!!props.url} close={props.close} maxWidth="half" fixedHeight>
        <div class="flex justify-center p-4">
          <img class="rounded-md" src={getAssetUrl(props.url!)} />
        </div>
      </Modal>
    ),
  })

  return null
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
        <PageHeader title="Character Designer" />
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
