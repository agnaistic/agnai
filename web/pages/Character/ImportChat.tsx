import { Component, createSignal } from 'solid-js'
import { X } from 'lucide-solid'
import { AppSchema } from '../../../srv/db/schema'
import Button from '../../shared/Button'
import FileInput, { FileInputResult, getFileAsString } from '../../shared/FileInput'
import Modal from '../../shared/Modal'
import { NewMsgImport, toastStore } from '../../store'

type ImportMessages = NewMsgImport['msgs']

const ImportChatModal: Component<{
  show: boolean
  close: () => void
  onSave: (msgs: ImportMessages) => void
  char?: AppSchema.Character
}> = (props) => {
  const [logImport, setLogImport] = createSignal<ImportMessages | undefined>()

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
    if (!msgs?.length) return
    props.onSave(msgs)
  }

  return (
    <Modal
      show={props.show}
      title={`Import Chat Log for ${props.char?.name}`}
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
        <FileInput
          label="JSON Lines File (.jsonl)"
          fieldName="json"
          accept="application/json-lines,application/jsonl,text/jsonl"
          helperText="Supported formats: TavernAI"
          required
          onUpdate={updateLogImport}
        />
      </div>
    </Modal>
  )
}

export default ImportChatModal

type LogImportFormat = keyof typeof formatMaps | 'agnai'
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
    sender: !!is_user ? 'user' : 'character',
    text: String(mes),
    timestamp: parseInt(send_date),
  }
}
