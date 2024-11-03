import { Component, createEffect, createMemo, createSignal, onMount, Show } from 'solid-js'
import { Plus, Save, X, Import, Download, SlidersVertical, Dices, Image } from 'lucide-solid'
import Button from '../../shared/Button'
import PageHeader from '../../shared/PageHeader'
import TextInput, { ButtonInput } from '../../shared/TextInput'
import { FormLabel } from '../../shared/FormLabel'
import { FileInputResult } from '../../shared/FileInput'
import {
  characterStore,
  tagStore,
  toastStore,
  chatStore,
  userStore,
  settingStore,
} from '../../store'
import { useNavigate, useSearchParams } from '@solidjs/router'
import PersonaAttributes from '../../shared/PersonaAttributes'
import Select from '../../shared/Select'
import TagInput from '../../shared/TagInput'
import { CultureCodes } from '../../shared/CultureCodes'
import VoicePicker from './components/VoicePicker'
import { AppSchema } from '../../../common/types/schema'
import { JSX } from 'solid-js'
import { Card, SolidCard, TitleCard } from '../../shared/Card'
import { usePane } from '../../shared/hooks'
import { RootModal } from '/web/shared/Modal'
import { Toggle } from '../../shared/Toggle'
import { useCharEditor } from './editor'
import { downloadCharacterHub, jsonToCharacter } from './port'
import { DownloadModal } from './DownloadModal'
import ImportCharacterModal from './ImportCharacter'
import Tabs, { useTabs } from '/web/shared/Tabs'
import { random } from '/web/shared/util'
import { imageApi } from '/web/store/data/image'
import { Page } from '/web/Layout'
import { ModeGenSettings } from '/web/shared/Mode/ModeGenSettings'
import { canStartTour, startTour } from '/web/tours'
import { Regenerate } from './form/Regenerate'
import { AvatarModal } from './form/AvatarModal'
import { AlternateGreetingsInput } from './form/AltGreetings'
import { SpriteModal } from './form/SpriteModal'
import { AdvancedOptions } from './form/AdvancedOptions'
import { AvatarField } from './form/AvatarField'

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
  let spriteRef: any

  const [search, setSearch] = useSearchParams()
  const nav = useNavigate()
  const user = userStore()

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
  const [openPreset, setOpenPreset] = createSignal(false)
  const [presetFooter, setPresetFooter] = createSignal<JSX.Element>()

  const editor = useCharEditor()

  const tagState = tagStore()
  const state = characterStore((s) => {
    const edit = s.editing

    return {
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

  onMount(async () => {
    characterStore.clearGeneratedAvatar()
    characterStore.clearCharacter()

    if (canStartTour('char')) {
      settingStore.closeMenu()
    }

    startTour('char')

    if (srcId()) {
      characterStore.getCharacter(srcId(), props.chat)
    }

    /* Character importing from CharacterHub */
    if (!query.import) return
    try {
      const { file, json } = await downloadCharacterHub(query.import)
      const imageData = await imageApi.getImageData(file)
      const char = jsonToCharacter(json)
      editor.load(char)
      editor.update({
        book: json.characterBook,
        alternateGreetings: json.alternateGreetings || [],
        avatar: file,
        personaKind: 'text',
      })
      editor.receiveAvatar(file)

      setImage(imageData)
      toastStore.success(`Successfully downloaded from Character Hub`)
    } catch (ex: any) {
      toastStore.error(`Character Hub download failed: ${ex.message}`)
    }
  })

  createEffect(() => {
    // We know we're waiting for a character to edit, so let's just wait
    if (!state.edit && srcId()) return

    // If this is our first pass: load something no matter what
    if (!editor.original()) {
      if (!srcId()) {
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
    const data = await editor.receiveAvatar(file)
    setImage(data)
  }

  const onSubmit = async (ev: Event) => {
    const payload = editor.payload(true)

    if (props.temp && props.chat) {
      if (editor.state.avatar) {
        const data = await imageApi.getImageData(editor.state.avatar)
        payload.avatar = data
      }
      chatStore.upsertTempCharacter(props.chat._id, { ...payload, _id: props.editId }, (result) => {
        props.onSuccess?.(result)
        if (paneOrPopup() === 'popup') props.close?.()
      })
    } else if (!forceNew() && props.editId) {
      characterStore.editFullCharacter(props.editId, payload, () => {
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

  const tabs = useTabs(['Persona', 'Voice', 'Images', 'Advanced'], +(search.char_tab || '0'))

  return (
    <Page
      classList={{
        'p-0': !isPage,
      }}
    >
      <Show when={!props.noTitle && (isPage || paneOrPopup() === 'pane')}>
        <PageHeader
          title={`${
            forceNew() ? 'Create' : props.editId ? 'Edit' : props.duplicateId ? 'Copy' : 'Create'
          } a Character`}
          subtitle={
            <>
              <div class="whitespace-normal">
                <em>
                  {totalTokens()} tokens, {totalPermanentTokens()} permanent
                </em>
              </div>
              <Button size="pill" class="w-fit" onClick={() => startTour('char', true)}>
                AI Character Generation Guide
              </Button>
            </>
          }
        />
      </Show>
      <form class="relative text-base">
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

          <div class={`flex grow flex-col justify-between gap-2`}>
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
              <Button onClick={() => setOpenPreset(true)} class="tour-preset">
                <SlidersVertical size={24} /> Preset
              </Button>
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

            <Tabs
              select={(id) => {
                tabs.select(id)
                setSearch({ char_tab: id })
              }}
              selected={tabs.selected}
              tabs={tabs.tabs}
            />

            <div class="flex flex-col gap-2" classList={{ hidden: tabs.current() !== 'Persona' }}>
              <Card class="tour-prefields">
                <ButtonInput
                  fieldName="name"
                  required
                  label="Character Name"
                  placeholder=""
                  value={editor.state.name}
                  parentClass="pb-2"
                  onChange={(ev) => editor.update('name', ev.currentTarget.value)}
                >
                  <Button
                    size="sm"
                    schema="input"
                    onClick={() => random('first', {}).then((name) => editor.update('name', name))}
                  >
                    <Dices size={12} />
                  </Button>
                </ButtonInput>

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
                    onChange={(ev) => editor.update('description', ev.currentTarget.value)}
                  />
                </div>
              </Card>

              <Card>
                <TagInput
                  availableTags={tagState.tags.map((t) => t.tag)}
                  value={editor.state.tags}
                  fieldName="_tags"
                  label="Tags"
                  helperText="Used to help you organize and filter your characters."
                  onSelect={(tags) => editor.update({ tags })}
                />
              </Card>

              <AvatarField
                user={user}
                editor={editor}
                updateFile={updateFile}
                showBuilder={setShowBuilder}
                image={image}
                setImageUrl={setImageUrl}
                forceNew={forceNew}
                spriteRef={spriteRef}
              />

              <Card>
                <TextInput
                  fieldName="scenario"
                  label={
                    <>
                      <Regenerate
                        field={'scenario'}
                        editor={editor}
                        allowed={editor.canGuidance}
                        class="tour-gen-field"
                      />
                      Scenario{' '}
                    </>
                  }
                  helperText="The current circumstances and context of the conversation and the characters."
                  placeholder="E.g. {{char}} is in their office working. {{user}} opens the door and walks in."
                  value={editor.state.scenario}
                  onChange={(ev) => editor.update('scenario', ev.currentTarget.value)}
                  isMultiline
                  tokenCount={(v) => setTokens((prev) => ({ ...prev, scenario: v }))}
                />
              </Card>

              <Card class="flex flex-col gap-3">
                <div>
                  <FormLabel
                    label={
                      <div class="flex items-center gap-1">
                        <Show when={editor.state.personaKind === 'text'}>
                          <Regenerate
                            field={'persona'}
                            editor={editor}
                            allowed={editor.canGuidance}
                          />
                        </Show>
                        Personality
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
                    class="tour-persona"
                    items={personaFormats()}
                    value={editor.state.personaKind}
                    onChange={(ev) => editor.update('personaKind', ev.value as any)}
                  />
                </div>

                <PersonaAttributes
                  schema={editor.state.personaKind}
                  tokenCount={(v) => setTokens((prev) => ({ ...prev, persona: v }))}
                  editor={editor}
                  state={editor.state.personaAttrs}
                  setter={(next) => editor.update('personaAttrs', next)}
                />
              </Card>
              <Card class="flex flex-col gap-3">
                <TextInput
                  isMultiline
                  fieldName="greeting"
                  label={
                    <>
                      <Regenerate field={'greeting'} editor={editor} allowed={editor.canGuidance} />
                      Greeting{' '}
                    </>
                  }
                  helperText="The first message from your character. It is recommended to provide a lengthy first message to encourage the character to give longer responses."
                  placeholder={
                    "E.g. *I smile as you walk into the room* Hello, {{user}}! I can't believe it's lunch time already! Where are we going?"
                  }
                  value={editor.state.greeting}
                  onChange={(ev) => editor.update('greeting', ev.currentTarget.value)}
                  class="h-60"
                  tokenCount={(v) => setTokens((prev) => ({ ...prev, greeting: v }))}
                />
                <AlternateGreetingsInput
                  greetings={editor.state.alternateGreetings}
                  setGreetings={(next) => editor.update({ alternateGreetings: next })}
                />
              </Card>
              <Card>
                <TextInput
                  isMultiline
                  fieldName="sampleChat"
                  label={
                    <>
                      <Regenerate
                        field={'sampleChat'}
                        editor={editor}
                        allowed={editor.canGuidance}
                      />
                      Sample Conversation{' '}
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
                  onChange={(ev) => editor.update('sampleChat', ev.currentTarget.value)}
                  tokenCount={(v) => setTokens((prev) => ({ ...prev, sample: v }))}
                />
              </Card>
            </div>

            <div class="flex flex-col gap-2" classList={{ hidden: tabs.current() !== 'Voice' }}>
              <Card class="flex flex-col gap-3">
                <h4 class="text-md font-bold">Voice</h4>
                <Toggle
                  fieldName="voiceDisabled"
                  value={editor.state.voiceDisabled}
                  label="Disable Character's Voice"
                  helperText="Toggle on to disable this character from automatically speaking"
                  onChange={(ev) => editor.update('voiceDisabled', ev)}
                />

                <VoicePicker
                  value={editor.state.voice}
                  culture={editor.state.culture}
                  onChange={(voice) => editor.update('voice', voice)}
                />

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

            <div
              class={`flex flex-col gap-2`}
              classList={{ hidden: tabs.current() !== 'Advanced' }}
            >
              <AdvancedOptions editor={editor} />
            </div>

            <div
              class={`flex items-center gap-2 text-center`}
              classList={{ hidden: tabs.current() !== 'Images' }}
            >
              Image Settings have moved: Click the <Image size={16} />
              in the main menu
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
          editor.receiveAvatar(imgs[0]!)
          setImage(imgs[0] as any)
          setImport(false)
        }}
        single
      />

      <AvatarModal url={imgUrl()} close={() => setImageUrl('')} />

      <Show when={openPreset()}>
        <RootModal
          title="Update Preset"
          show
          close={() => setOpenPreset(false)}
          maxWidth="half"
          maxHeight
          footer={presetFooter()}
        >
          <sub>This preset used for character generation</sub>
          <ModeGenSettings
            presetId={user.user?.chargenPreset || user.user?.defaultPreset}
            onPresetChanged={(id) => userStore.updatePartialConfig({ chargenPreset: id })}
            close={() => setOpenPreset(false)}
            hideTabs={['Memory', 'Prompt']}
            footer={setPresetFooter}
          />
        </RootModal>
      </Show>
    </Page>
  )
}
