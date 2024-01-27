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
import { Trans, useTransContext } from '@mbarzda/solid-i18next'
import { TFunction } from 'i18next'

const formatOptions = (t: TFunction) => [
  { value: 'attributes', label: t('attributes_key_value') },
  { value: 'text', label: t('plain_text') },
]

const backupFormats = (t: TFunction): any => ({
  sbf: { value: 'sbf', label: t('sbf') },
  wpp: { value: 'wpp', label: t('w++') },
  boostyle: { value: 'boostyle', label: t('boostyle') },
})

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
  const [t] = useTransContext()

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

  const editor = useCharEditor(t)

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
    const options = formatOptions(t).slice()
    if (editor.state.personaKind in backupFormats(t)) {
      options.push(backupFormats(t)[editor.state.personaKind])
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
      await editor.generateCharacter(t, genService(), fields)
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
      const { file, json } = await downloadCharacterHub(t, query.import)
      const imageData = await getImageData(file)
      const char = jsonToCharacter(t, json)
      editor.load(char)
      editor.update({
        book: json.characterBook,
        alternateGreetings: json.alternateGreetings || [],
        avatar: file,
        personaKind: 'text',
      })

      setImage(imageData)
      toastStore.success(t('successfully_downloaded_from_character_hub'))
    } catch (ex: any) {
      toastStore.error(t('character_hub_download_failed_with_message_x', { message: ex.message() }))
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
        {props.close ? t('close') : t('cancel')}
      </Button>
      <Button onClick={onSubmit} disabled={state.creating}>
        <Save />
        {props.editId && !forceNew() ? t('update') : t('create')}
      </Button>
    </>
  )

  const showWarning = createMemo(
    () => !!props.chat?.overrides && props.chat.characterId === props.editId
  )

  const tabs = useTabs([t('basic'), t('advanced')], 0)

  let spriteRef: any

  return (
    <>
      <Show when={!props.noTitle && (isPage || paneOrPopup() === 'pane')}>
        <PageHeader
          noslot={!!query.import}
          title={t('action_x_a_character', {
            action: forceNew()
              ? t('create')
              : props.editId
              ? t('edit')
              : props.duplicateId
              ? t('copy')
              : t('create'),
          })}
          subtitle={
            <div class="whitespace-normal">
              <em>
                {t('x_tokens_x_permanent', {
                  total_token: totalTokens(),
                  total_permanent: totalPermanentTokens(),
                })}
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
              <Trans key="chat_override_warning">
                <b>Warning!</b> Your chat currently overrides your character definitions. These
                changes won't affect your current chat until you disable them in the "Edit Chat"
                menu.
              </Trans>
            </SolidCard>
          </Show>

          <div class={`flex grow flex-col justify-between gap-2 pl-2 pr-3 `}>
            <Show when={!isPage && paneOrPopup() === 'popup'}>
              <div>
                <em>
                  {t('x_tokens_x_permanent', {
                    total_token: totalTokens(),
                    total_permanent: totalPermanentTokens(),
                  })}
                </em>
              </div>
            </Show>

            <Show when={props.temp}>
              <TitleCard type="premium">
                <Trans
                  key="you_are_action_x_temporary_character"
                  options={{
                    action: props.editId ? t('editing').toLowerCase() : t('creating').toLowerCase(),
                  }}
                ></Trans>
                You are {'{{action}}'} a temporary character. A temporary character exist within
                your current chat only.
              </TitleCard>
            </Show>

            <div class="flex justify-end gap-2 text-[1em]">
              <Button onClick={() => setImport(true)}>
                <Import /> {t('import')}
              </Button>

              <Button onClick={() => setConverted(editor.convert())}>
                <Download /> {t('export')}
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

            {/* Error when <Trans> */}
            <div class="flex flex-col gap-2" classList={{ hidden: tabs.current() !== t('basic') }}>
              <Button
                size="sm"
                class="w-fit"
                onClick={() => {
                  rootModalStore.info(
                    t('ai_character_generation'),
                    <>
                      {t('character_generation_list_1')} <Pill small>{t('description')}</Pill>{' '}
                      {t('field').toLowerCase()}
                      <br />
                      {t('character_generation_list_2')}
                      <br />
                      {t('character_generation_list_3')}&nbsp;
                      <Pill inverse type="hl" small>
                        {t('generate')}
                      </Pill>
                      &nbsp;
                      {t('it_may_take_seconds_to_generate')}
                      <br />
                      {t('character_generation_list_4')} <Pill small>{t('description')}</Pill>{' '}
                      {t('and_click')}&nbsp;
                      <Pill type="hl" inverse small>
                        {t('regenerate')}
                      </Pill>
                      &nbsp;
                      {t('to_regenerate_specific_fields')}
                    </>
                  )
                }}
              >
                <HelpCircle size={16} /> {t('ai_character_generation')}
              </Button>
              <Card>
                <TextInput
                  fieldName="name"
                  required
                  label={t('character_name')}
                  placeholder=""
                  value={editor.state.name}
                  tokenCount={(v) => setTokens((prev) => ({ ...prev, name: v }))}
                />
              </Card>

              <Card class="flex w-full flex-col">
                <FormLabel
                  label={t('description_or_creators_note')}
                  helperText={
                    <div class="flex flex-col">
                      <span>{t('creators_note_message')}</span>
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
                        {creating() ? t('generating') : t('generate')}
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
                  label={t('tags')}
                  helperText={t('tags_message')}
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
                  <Button size="pill" class="w-fit" onClick={() => editor.createAvatar(t)}>
                    {t('generate_image')}
                  </Button>
                </div>
                <div class="flex w-full flex-col gap-2">
                  <ToggleButtons
                    items={[
                      { value: 'avatar', label: t('avatar') },
                      { value: 'sprite', label: t('sprite') },
                    ]}
                    onChange={(opt) => editor.update('visualType', opt.value)}
                    selected={editor.state.visualType}
                  />

                  <Switch>
                    <Match when={editor.state.visualType === 'avatar'}>
                      <FileInput
                        class="w-full"
                        fieldName="avatar"
                        label={t('avatar')}
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
                          helperText={t('avatar_message')}
                          placeholder={t('appearance_prompt')}
                          value={editor.state.appearance}
                        />
                      </div>
                    </Match>
                    <Match when={true}>
                      <Button class="w-fit" onClick={() => setShowBuilder(true)}>
                        {t('open_character_builder')}
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
                      {t('scenario')}{' '}
                      <Regenerate
                        fields={['scenario']}
                        service={genService()}
                        editor={editor}
                        allowed={editor.canGuidance}
                      />
                    </>
                  }
                  helperText={t('scenario_message')}
                  placeholder={t('scenario_example')}
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
                      {t('greeting')}{' '}
                      <Regenerate
                        fields={['greeting']}
                        service={genService()}
                        editor={editor}
                        allowed={editor.canGuidance}
                      />
                    </>
                  }
                  helperText={t('greeting_message')}
                  placeholder={t('greeting_example')}
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
                        {t('persona_schema')}
                        <Regenerate
                          fields={['personality', 'behaviour']}
                          service={genService()}
                          editor={editor}
                          allowed={editor.canGuidance}
                        />{' '}
                      </div>
                    }
                    helperText={
                      <Trans key="persona_message">
                        <p>If you do not know what this mean, you can leave this as-is.</p>
                        <p class="font-bold">
                          WARNING: "Plain Text" and "Non-Plain Text" schemas are not compatible.
                          Changing between them will cause data loss.
                        </p>
                        <p>Format to use for the character's format</p>
                      </Trans>
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
                      {t('sample_conversation')}{' '}
                      <Regenerate
                        fields={['example1', 'example2']}
                        service={genService()}
                        editor={editor}
                        allowed={editor.canGuidance}
                      />
                    </>
                  }
                  helperText={<span>{t('sample_conversation_message')}</span>}
                  placeholder={t('sample_conversation_example')}
                  value={editor.state.sampleChat}
                  tokenCount={(v) => setTokens((prev) => ({ ...prev, sample: v }))}
                />
              </Card>
            </div>

            <div
              class={`flex flex-col gap-2`}
              classList={{ hidden: tabs.current() !== t('advanced') }}
            >
              <Card class="flex flex-col gap-2">
                <TextInput
                  isMultiline
                  fieldName="systemPrompt"
                  label={t('character_system_prompt')}
                  helperText={<span>{t('character_system_prompt_message')}</span>}
                  placeholder={t('character_system_prompt_example')}
                  value={editor.state.systemPrompt}
                />
                <TextInput
                  isMultiline
                  fieldName="postHistoryInstructions"
                  label={t('post_conversation_history_instructions')}
                  helperText={<span>{t('post_conversation_history_instructions_message')}</span>}
                  placeholder={t('post_conversation_history_instructions_example')}
                  value={editor.state.postHistoryInstructions}
                />
                <TextInput
                  isMultiline
                  class="min-h-[80px]"
                  fieldName="insertPrompt"
                  label={t('insert_depth_prompt')}
                  helperMarkdown={t('insert_depth_prompt_message')}
                  placeholder={t('insert_depth_prompt_example')}
                  value={editor.state.insert?.prompt}
                />
                <RangeInput
                  fieldName="insertDepth"
                  label={t('insert_depth')}
                  helperText={
                    <Trans key="insert_depth_message">
                      The number of messages that should exist below the <b>Insert Prompt</b>.
                      Between 1 and 5 is recommended.
                    </Trans>
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
                  label={t('creator')}
                  placeholder={t('creator_example')}
                  value={editor.state.creator}
                />
              </Card>
              <Card>
                <TextInput
                  fieldName="characterVersion"
                  label={t('character_version')}
                  placeholder={t('character_version_example')}
                  value={editor.state.characterVersion}
                />
              </Card>
              <Card class="flex flex-col gap-3">
                <h4 class="text-md font-bold">{t('voice')}</h4>
                <Toggle
                  fieldName="voiceDisabled"
                  value={editor.state.voiceDisabled}
                  label={t('disable_character_voice')}
                  helperText={t('disable_character_voice_message')}
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
                  label={t('language')}
                  helperText={t('language_message', {
                    note:
                      editor.state.culture.startsWith('en') ?? true
                        ? ''
                        : ' ' + t('you_need_to_also_translate_gaslight'),
                  })}
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
  const [t] = useTransContext()

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
          onClick={() => props.editor.generateCharacter(t, props.service, props.fields)}
          disabled={props.editor.generating()}
        >
          {props.children || t('regenerate')}
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
  const [t] = useTransContext()

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
              placeholder={t('alternate_greeting_message')}
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
          {t('add_alternate_greeting')}
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

  const [t] = useTransContext()

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
              {t('cancel')}
            </Button>
            <Button onClick={handleChange}>{t('confirm')}</Button>
          </>
        }
      >
        <PageHeader title={t('character_designer')} />
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
  const [t] = useTransContext()

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
    { label: t('import_memory_book'), value: NONE_VALUE },
    ...memory.books.list.map((book) => ({ label: book.name, value: book._id })),
  ])
  const pickInternalMemoryBook = (option: Option) => {
    const newBook = memory.books.list.find((book) => book._id === option.value)
    props.setBundledBook(newBook ? { ...newBook, _id: BUNDLED_CHARACTER_BOOK_ID } : undefined)
  }
  const initBlankCharacterBook = () => {
    props.setBundledBook(emptyBookWithEmptyEntry(t))
  }
  const deleteBook = () => {
    props.setBundledBook(undefined)
  }
  const ModalFooter = () => (
    <>
      <Button schema="secondary" onClick={() => setIsModalShown(false)}>
        {t('close')}
      </Button>
      <Button type="submit">
        <Save />
        {t('save_character_book')}
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
      title={t('chat_memory')}
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
      <h4 class="text-lg">{t('character_book')}</h4>
      <Show when={!props.bundledBook}>
        <span class="text-sm"> {t('this_character_does_not_have_character_book')} </span>
        <div class="flex flex-col gap-3 sm:flex-row">
          <Select
            fieldName="memoryBook"
            value={NONE_VALUE}
            items={internalMemoryBookOptions()}
            onChange={pickInternalMemoryBook}
          />
          <Button onClick={initBlankCharacterBook}>{t('create_new_book')}</Button>
        </div>
      </Show>
      <Show when={props.bundledBook}>
        <span class="text-sm">{t('this_character_has_character_book')}</span>
        <div class="mt-2 flex gap-3">
          <Button onClick={() => setIsModalShown(true)}>{t('edit_book')}</Button>
          <Button onClick={deleteBook}>{t('delete_book')}</Button>
        </div>
      </Show>
    </div>
  )
}
