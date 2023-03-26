import { Component, createEffect, createSignal, Show } from 'solid-js'
import { X } from 'lucide-solid'
import { AppSchema } from '../../../srv/db/schema'
import Button from '../../shared/Button'
import FileInput, { FileInputResult, getFileAsString } from '../../shared/FileInput'
import Modal from '../../shared/Modal'
import { characterStore, NewMsgImport, toastStore } from '../../store'
import Divider from '../../shared/Divider'
import Dropdown from '../../shared/Dropdown'

type StagedLog = NewMsgImport['msgs']

const ImportChatModal: Component<{
  show: boolean
  close: () => void
  onSave: (msgImport: NewMsgImport) => void
  char?: AppSchema.Character
}> = (props) => {
  const [stagedLog, setStagedLog] = createSignal<StagedLog>()
  const [charId, setCharId] = createSignal<string>()
  const charState = characterStore((s) => ({ chars: s.characters.list }))

  createEffect(() => {
    if (!charId() && props.char) {
      setCharId(props.char._id)
    } else if (!charId() && charState.chars.length) {
      setCharId(charState.chars[0]._id)
    }
  })

  const onSelectLog = async (files: FileInputResult[]) => {
    if (!files.length) return setStagedLog()
    try {
      const textContent = await getFileAsString(files[0])
      // Assumes that the file is a jsonl file; needs more robust handling for future formats
      const logLines = textContent
        .split('\n')
        .map((line) => JSON.parse(line))
        .filter(Boolean)
      const parsed = parseLog(logLines)
      setStagedLog(parsed)
      toastStore.success('Chat log accepted')
    } catch (ex) {
      const message = ex instanceof Error ? ex.message : 'Unknown error'
      toastStore.warn(`Invalid chat log file format. Supported formats: TavernAI (${message})`)
      console.error(ex)
      setStagedLog()
    }
  }

  const onImport = () => {
    const msgs = stagedLog()
    const char = charState.chars.find((char) => char._id === charId())
    if (!msgs?.length || !char) return
    props.onSave({ msgs, char })
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
          <strong>Note: </strong>This currently doesn't support multi-user chats. All messages will
          be attributed either to you or the selected character.
        </p>
        <Divider />
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
          onUpdate={onSelectLog}
        />
        <Show when={stagedLog()}>
          <p>{stagedLog()?.length} message(s) will be imported.</p>
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

function parseLog(log: any[]): StagedLog {
  const format = getLogFormat(log)
  if (format === 'tavern') {
    return log.slice(1).map(parseTavernLine)
  }
  return []
}

type TavernFormat = typeof formatMaps.tavern
type TavernLine = { [K in TavernFormat[keyof TavernFormat]]: any }
function parseTavernLine(line: TavernLine): StagedLog[number] {
  const { is_user, mes, send_date } = line
  return {
    sender: JSON.parse(is_user) ? 'user' : 'character',
    text: String(mes),
    timestamp: parseInt(send_date),
  }
}
