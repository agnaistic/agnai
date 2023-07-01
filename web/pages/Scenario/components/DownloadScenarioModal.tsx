import { Component, createMemo } from 'solid-js'
import { AppSchema } from '/common/types'
import Modal from '/web/shared/Modal'
import Button from '/web/shared/Button'
import { Save, X } from 'lucide-solid'
import { deepCloneAndRemoveFields } from '/web/shared/util'

export const ExportScenarioModal: Component<{
  show: boolean
  close: () => void
  scenario: AppSchema.ScenarioBook | undefined
}> = (props) => {
  const filename = createMemo(() => {
    if (!props.scenario) return
    const name = props.scenario.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()
    return `${name}.scenario.json`
  })

  const encodedJson = createMemo(() => {
    if (!props.scenario) return ''
    const clone = deepCloneAndRemoveFields(props.scenario, ['_id', 'userId', 'kind'])

    const dataStr =
      'data:text/json;charset=utf-8,' +
      encodeURIComponent(
        JSON.stringify({ ...clone, $schema: 'https://agnai.chat/schemas/scenario-schema-v1.json' })
      )
    return dataStr
  })

  return (
    <Modal
      show={props.show}
      close={props.close}
      title="Download Scenario"
      footer={
        <Button schema="secondary" onClick={props.close}>
          <X /> Close
        </Button>
      }
    >
      <div class="flex w-full justify-center">
        <a href={encodedJson()} download={filename()}>
          <Button>
            <Save />
            {filename()}
          </Button>
        </a>
      </div>
    </Modal>
  )
}
