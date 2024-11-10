import { Component, createEffect, createSignal, Show } from 'solid-js'
import { Upload, X } from 'lucide-solid'
import { AppSchema } from '../../../common/types/schema'
import Button from '../../shared/Button'
import FileInput, { FileInputResult, getFileAsString } from '../../shared/FileInput'
import Modal from '../../shared/Modal'
import { characterStore, chatStore, ImportChat, toastStore } from '../../store'
import Divider from '../../shared/Divider'
import Select from '../../shared/Select'
import { assertValid } from '/common/valid'
import { sort } from '../../shared/util'

const importValid = {
  name: 'string',
  greeting: 'string',
  scenario: 'string',
  sampleChat: 'string',
  messages: [
    {
      msg: 'string',
      characterId: 'string?',
      userId: 'string?',
    },
  ],
} as const

const ImportChatModal: Component<{
  show: boolean
  close: () => void
  char?: AppSchema.Character
}> = (props) => {
  const [json, setJson] = createSignal<ImportChat>()
  const [charId, setCharId] = createSignal<string>()
  const state = characterStore((s) => ({ chars: s.characters.list.slice().sort(sort('name')) }))

  createEffect(() => {
    if (props.char && props.char._id !== charId()) {
      setCharId(props.char?._id)
    } else if (!charId() && state.chars.length) {
      setCharId(state.chars[0]._id)
    }
  })

  const onSelectLog = async (files: FileInputResult[]) => {
    if (!files.length) return setJson()
    try {
      const content = await getFileAsString(files[0])
      const parsed = parseContent(content)
      if (!parsed) {
        throw new Error(`Unrecognized format`)
      }
      assertValid(importValid, parsed.json)
      setJson(parsed.json)

      // TODO: Set chat log to signal
      toastStore.success('Chat log accepted')
    } catch (ex) {
      const message = ex instanceof Error ? ex.message : 'Unknown error'
      toastStore.warn(
        `Invalid chat log file format. Supported formats: Agnaistic, TavernAI (${message})`
      )
      setJson()
    }
  }

  const onImport = () => {
    const chat = json()
    const char = state.chars.find((char) => char._id === charId())
    if (!chat?.messages.length || !char) return
    chatStore.importChat(char._id, chat, props.close)
  }

  return (
    <Modal
      show={props.show}
      title="Import Chat Log"
      close={props.close}
      footer={
        <>
          <Button schema="secondary" onClick={props.close}>
            <X />
            Cancel
          </Button>
          <Button onClick={onImport}>
            <Upload />
            Import
          </Button>
        </>
      }
    >
      <div class="flex flex-col gap-2">
        <p>
          <strong>Note: </strong>This currently doesn't support multi-user chats. All messages will
          be attributed either to you or the selected character.
        </p>
        <Divider />
        <Show when={!props.char}>
          <Select
            fieldName="charName"
            label="Character"
            value={charId()}
            items={state.chars.map((char) => ({ label: char.name, value: char._id }))}
            onChange={(item) => setCharId(item.value)}
          />
        </Show>
        <Show when={!!props.char}>
          <p>Your chat log will be imported for {props.char?.name}.</p>
        </Show>
        <FileInput
          label="JSON Lines File (.jsonl)"
          fieldName="json"
          accept=".txt, application/json, application/json-lines, application/jsonl, text/jsonl"
          helperText="Supported formats: Agnaistic, TavernAI"
          required
          onUpdate={onSelectLog}
        />
        <Show when={json()}>
          <p>{json()?.messages.length} message(s) will be imported.</p>
        </Show>
      </div>
    </Modal>
  )
}

export default ImportChatModal

function parseContent(content: string) {
  /**
   * Agnaistic format
   */
  try {
    const json = JSON.parse(content)
    assertValid(
      {
        name: 'string',
        greeting: 'string',
        scenario: 'string',
        sampleChat: 'string',
        messages: [{ msg: 'string', characterId: 'string?', userId: 'string?' }],
      },
      json
    )

    return { type: 'aganistic', json }
  } catch (ex) {}

  /**
   * TavernAI format
   */
  try {
    const lines = content
      .split('\n')
      .slice(1)
      .filter((line) => !!line.trim())
      .map((line) => JSON.parse(line))

    const messages = lines.map((line) => ({
      msg: String(line.mes),
      userId: line.is_user ? 'anon' : undefined,
      characterId: line.is_user ? undefined : 'imported',
    }))

    const json = {
      name: '',
      greeting: '',
      scenario: '',
      sampleChat: '',
      messages,
    }
    return { kind: 'tavern', json }
  } catch (ex) {}

  return
}
