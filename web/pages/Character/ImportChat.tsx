import { Component, createEffect, createSignal, Show } from 'solid-js'
import { X } from 'lucide-solid'
import { AppSchema } from '../../../srv/db/schema'
import Button from '../../shared/Button'
import FileInput, { FileInputResult, getFileAsString } from '../../shared/FileInput'
import Modal from '../../shared/Modal'
import { characterStore, NewMsgImport, toastStore } from '../../store'
import Divider from '../../shared/Divider'
import Dropdown from '../../shared/Dropdown'

type ImportMessages = NewMsgImport['msgs']

const ImportChatModal: Component<{
  show: boolean
  close: () => void
  onSave: (char: AppSchema.Character, msgs: ImportMessages) => void
  char?: AppSchema.Character
}> = (props) => {
  const [logImport, setLogImport] = createSignal<ImportMessages>()
  const [charId, setCharId] = createSignal<string>()
  const charState = characterStore((s) => ({ chars: s.characters.list }))

  createEffect(() => {
    if (!charId() && props.char) {
      setCharId(props.char._id)
    } else if (!charId() && charState.chars.length) {
      setCharId(charState.chars[0]._id)
    }
  })

  const updateLogImport = async (files: FileInputResult[]) => {
    if (!files.length) return setLogImport()
    try {
      const content = await getFileAsString(files[0])
      // Assumes that the file is a jsonl file, but may need more robust handling for other formats
      const lines = content
        .split('\n')
        .map((line) => JSON.parse(line))
        .filter(Boolean)
      const result = parseLog(lines)
      setLogImport(result)
      toastStore.success('Chat log accepted')
    } catch (ex) {
      const message = ex instanceof Error ? ex.message : 'Unknown error'
      toastStore.warn(`Invalid chat log file format. Supported formats: TavernAI (${message})`)
      console.error(ex)
      setLogImport()
    }
  }

  const onImport = () => {
    const msgs = logImport()
    const char = charState.chars.find((char) => char._id === charId())
    if (!msgs?.length || !char) return
    props.onSave(char, msgs)
  }

  return (
    <Modal
      show={props.show}
      title={'Import Chat Log'}
      close={props.close}
      footer={
        <>
          <Button schema="secondary" onClick={props.close}>
            <X />
            Cancel
          </Button>
          <Button onClick={onImport}>Import</Button>
        </>
      }
    >
      <div class="flex flex-col gap-2">
        <p>
          You can import a chat log from a supported format. A new chat will be created, and all
          messages in the log will be attributed either to you or the character you select.
        </p>
        <Show when={!props.char}>
          <Dropdown
            fieldName="charName"
            label="Character"
            value={charId()}
            items={charState.chars.map((char) => ({ label: char.name, value: char._id }))}
            onChange={(item) => setCharId(item.value)}
          />
        </Show>
        <Show when={!!props.char}>
          <p>Your chat log will be imported for {props.char?.name}.</p>
        </Show>
        <FileInput
          label="JSON Lines File (.jsonl)"
          fieldName="json"
          accept="application/json-lines,application/jsonl,text/jsonl"
          helperText="Supported formats: TavernAI"
          required
          onUpdate={updateLogImport}
        />
        <Show when={logImport()}>
          <p>{logImport()?.length} message(s) will be imported.</p>
        </Show>
      </div>
    </Modal>
  )
}

export default ImportChatModal

type LogImportFormat = keyof typeof formatMaps
type LogImportKeys = {
  timestamp: string
  sender: string
  text: string
}

const formatMaps = {
  tavern: {
    timestamp: 'send_date',
    sender: 'is_user',
    text: 'mes',
  } as const,
} satisfies Record<string, LogImportKeys>

function getLogFormat(log: any[]): LogImportFormat {
  // The first line of a TavernAI jsonl file is a chat metadata object.
  if ('user_name' in log[0] && 'character_name' in log[0] && 'create_date' in log[0])
    return 'tavern'
  throw new Error('Unrecognized log format')
}

function parseLog(log: any[]): ImportMessages {
  const format = getLogFormat(log)
  if (format === 'tavern') {
    return log.slice(1).map(parseTavernLine)
  }
  return []
}

type TavernFormat = typeof formatMaps.tavern
type TavernLine = { [K in TavernFormat[keyof TavernFormat]]: any }
function parseTavernLine(line: TavernLine): ImportMessages[number] {
  const { is_user, mes, send_date } = line
  return {
    sender: JSON.parse(is_user) ? 'user' : 'character',
    text: String(mes),
    timestamp: parseInt(send_date),
  }
}
