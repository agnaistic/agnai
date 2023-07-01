import { Component, createMemo, createSignal, For, Show } from 'solid-js'
import { Check, Upload, X } from 'lucide-solid'
import { AppSchema, NewScenario } from '/common/types'
import Button from '../../../shared/Button'
import FileInput, { FileInputResult, getFileAsString } from '../../../shared/FileInput'
import Modal from '../../../shared/Modal'
import { scenarioStore, toastStore } from '../../../store'

type ImportStatus = 'success' | 'failed' | 'pending'

const supportedScenarioSchemas = ['https://agnai.chat/schemas/scenario-schema-v1.json']

const ImportScenarioModal: Component<{
  show: boolean
  close: () => void
  char?: AppSchema.Character
}> = (props) => {
  const [status, setStatus] = createSignal<ImportStatus>('pending')
  const [importing, setImporting] = createSignal(false)
  const [json, setJson] = createSignal<{ scenario: NewScenario; status: ImportStatus }[]>([])
  const canImport = createMemo(() => json().some((s) => s.status === 'pending'))

  const onFileSelect = async (files: FileInputResult[]) => {
    if (importing()) return
    setJson([])
    if (!files.length) return
    for (let file of files) {
      try {
        const content = await getFileAsString(file)
        const parsed = JSON.parse(content)
        if (!parsed) {
          toastStore.error(`File was not a valid JSON: ${file.file.name}`)
          continue
        }
        if (!supportedScenarioSchemas.includes(parsed.$schema)) {
          toastStore.error(
            `File was not a supported scenario (incorrect schema): ${file.file.name}`
          )
          continue
        }
        delete parsed.$schema
        setJson([...json(), { scenario: parsed, status: 'pending' }])
      } catch (ex) {
        const message = ex instanceof Error ? ex.message : 'Unknown error'
        toastStore.warn(`Invalid scenario: ${message}`)
      }
    }
  }

  const onImport = () => {
    if (importing()) return
    setImporting(true)
    importNext()
  }

  const importNext = () => {
    const next = json().find((s) => s.status === 'pending')
    if (!next) {
      setImporting(false)
      setStatus(json().every((s) => s.status === 'success') ? 'success' : 'failed')
      return
    }
    scenarioStore.create(
      next.scenario,
      () => {
        setJson([
          ...json().map((s) => (s === next ? { ...next, status: 'success' as ImportStatus } : s)),
        ])
        importNext()
      },
      () => {
        setJson([
          ...json().map((s) => (s === next ? { ...next, status: 'failed' as ImportStatus } : s)),
        ])
        importNext()
      }
    )
  }

  return (
    <Modal
      show={props.show}
      title="Import Scenario"
      close={props.close}
      footer={
        <>
          <Show when={status() === 'success'}>
            <Button schema="primary" onClick={props.close}>
              <Check />
              Done
            </Button>
          </Show>
          <Show when={status() !== 'success'}>
            <Button schema="secondary" onClick={props.close}>
              <X />
              Cancel
            </Button>
            <Button onClick={onImport} disabled={!canImport()}>
              <Upload />
              Import
            </Button>
          </Show>
        </>
      }
    >
      <div class="flex flex-col gap-2">
        <Show when={!importing() && status() !== 'success'}>
          <FileInput
            label="Scenario JSON File"
            fieldName="json"
            accept="application/json,text/json"
            helperText="Supported formats: Agnaistic"
            required
            onUpdate={onFileSelect}
          />
        </Show>
        <Show when={json().length}>
          <ul class="list-inside list-disc">
            <For each={json()}>
              {(s) => (
                <li class="flex flex-row items-center gap-2">
                  <div
                    classList={{
                      'text-green-500': s.status === 'success',
                      'text-gray-500': s.status === 'pending',
                      'text-red-500': s.status === 'failed',
                    }}
                  >
                    <Check size={16} />
                  </div>
                  <span>{s.scenario.name}</span>
                </li>
              )}
            </For>
          </ul>
        </Show>
      </div>
    </Modal>
  )
}

export default ImportScenarioModal
