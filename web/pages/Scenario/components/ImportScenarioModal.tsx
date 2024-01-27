import { Component, createMemo, createSignal, For, Show } from 'solid-js'
import { Check, Upload, X } from 'lucide-solid'
import { AppSchema, NewScenario } from '/common/types'
import Button from '../../../shared/Button'
import FileInput, { FileInputResult, getFileAsString } from '../../../shared/FileInput'
import Modal from '../../../shared/Modal'
import { scenarioStore, toastStore } from '../../../store'
import { useTransContext } from '@mbarzda/solid-i18next'

type ImportStatus = 'success' | 'failed' | 'pending'

const supportedScenarioSchemas = ['https://agnai.chat/schemas/scenario-schema-v1.json']

const ImportScenarioModal: Component<{
  show: boolean
  close: () => void
  char?: AppSchema.Character
}> = (props) => {
  const [t] = useTransContext()

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
          toastStore.error(
            t('file_was_not_a_valid_json_with_message_x', {
              message: file.file.name,
            })
          )
          continue
        }
        if (!supportedScenarioSchemas.includes(parsed.$schema)) {
          toastStore.error(
            t('file_was_not_a_supported_scenario_with_message_x', {
              message: file.file.name,
            })
          )
          continue
        }
        delete parsed.$schema
        setJson([...json(), { scenario: parsed, status: 'pending' }])
      } catch (ex) {
        const message = ex instanceof Error ? ex.message : t('unknown_error')
        toastStore.warn(t('invalid_scenario_x', { message: message }))
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
      title={t('import_scenario')}
      close={props.close}
      footer={
        <>
          <Show when={status() === 'success'}>
            <Button schema="primary" onClick={props.close}>
              <Check />
              {t('done')}
            </Button>
          </Show>
          <Show when={status() !== 'success'}>
            <Button schema="secondary" onClick={props.close}>
              <X />
              {t('cancel')}
            </Button>
            <Button onClick={onImport} disabled={!canImport()}>
              <Upload />
              {t('import')}
            </Button>
          </Show>
        </>
      }
    >
      <div class="flex flex-col gap-2">
        <Show when={!importing() && status() !== 'success'}>
          <FileInput
            label={t('scenario_json_file')}
            fieldName="json"
            accept="application/json,text/json"
            helperText={t('supported_scenario_formats')}
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
