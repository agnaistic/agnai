import { Component, For, Show, createMemo, createSignal, onMount } from 'solid-js'
import PageHeader from '/web/shared/PageHeader'
import Button from '/web/shared/Button'
import { presetStore } from '/web/store/presets'
import { Copy, Plus, Save, Trash } from 'lucide-solid'
import Divider from '/web/shared/Divider'
import { templates } from '../../../common/presets/templates'
import { useRootModal } from '/web/shared/hooks'
import Modal from '/web/shared/Modal'
import PromptEditor from '/web/shared/PromptEditor'
import TextInput from '/web/shared/TextInput'
import { AppSchema } from '/common/types'
import { getStrictForm } from '/web/shared/util'
import { toastStore } from '/web/store'

export { PromptTemplates as default }

const PromptTemplates: Component = () => {
  const state = presetStore((s) => ({ templates: s.templates }))

  const [show, setShow] = createSignal<boolean>(false)
  const [edit, setEdit] = createSignal<AppSchema.PromptTemplate>()
  const [initial, setInitial] = createSignal<string>()

  const builtins = createMemo(() =>
    Object.entries(templates).map(([name, template]) => ({
      name,
      template,
    }))
  )

  onMount(() => {
    presetStore.getTemplates()
  })

  const close = () => {
    setEdit()
    setShow(false)
    setInitial('')
  }

  return (
    <>
      <PageHeader title="Prompt Templates" />

      <div class="flex w-full flex-col gap-4">
        <div class="flex w-full justify-end">
          <Button onClick={() => setShow(true)}>
            <Plus size={16} /> Template
          </Button>
        </div>

        <div class="flex w-full flex-col gap-2">
          <Show when={state.templates.length === 0}>
            <div class="flex justify-center">You have no prompt templates saved</div>
          </Show>
          <For each={state.templates}>
            {(each) => (
              <div class="flex gap-2">
                <div
                  class="bg-800 hover:bg-700 w-full cursor-pointer rounded-md p-2"
                  onClick={() => {
                    setEdit(each)
                    setShow(true)
                  }}
                >
                  {each.name}
                </div>
                <Button
                  schema="secondary"
                  onClick={() => {
                    setInitial(each.template)
                    setShow(true)
                  }}
                >
                  <Copy />
                </Button>
                <Button
                  schema="red"
                  onClick={() => {
                    presetStore.deleteTemplate(each._id)
                  }}
                >
                  <Trash />
                </Button>
              </div>
            )}
          </For>
          <Divider />
          <div class="flex justify-center text-xl font-bold">Built-in Templates</div>
          <For each={builtins()}>
            {(each) => (
              <div class="flex w-full gap-2 font-bold">
                <div
                  class="bg-800 hover:bg-700 w-full cursor-pointer rounded-md p-2"
                  onClick={() => {
                    setInitial(each.template)
                    setShow(true)
                  }}
                >
                  {each.name}
                </div>
              </div>
            )}
          </For>
        </div>
      </div>
      <TemplateModal show={show()} close={close} initial={initial()} edit={edit()} />
    </>
  )
}

const TemplateModal: Component<{
  show: boolean
  edit?: AppSchema.PromptTemplate
  initial?: string
  close: () => void
}> = (props) => {
  let form: HTMLFormElement

  const submit = () => {
    const { name, template } = getStrictForm(form, { name: 'string', template: 'string' })

    form.reportValidity()
    if (!form.checkValidity()) {
      return
    }

    if (props.edit) {
      presetStore.updateTemplate(props.edit._id, { name, template }, () => {
        toastStore.success('Template updated')
        props.close()
      })
      return
    }

    presetStore.createTemplate(name, template, () => {
      toastStore.success('Template created')
      props.close()
    })
  }

  const Footer = (
    <>
      <Button schema="secondary" onClick={props.close}>
        Cancel
      </Button>
      <Button schema="primary" onClick={submit}>
        <Save /> Save
      </Button>
    </>
  )

  useRootModal({
    id: 'prompt-templates',
    element: (
      <Modal
        title={'Prompt Templates'}
        maxWidth="half"
        show={props.show}
        close={props.close}
        footer={Footer}
      >
        <form ref={form!} class="flex flex-col gap-4 text-sm">
          <TextInput
            fieldName="name"
            placeholder="Name"
            label="Name"
            value={props.edit?.name || ''}
            required
          />
          <PromptEditor
            fieldName="template"
            value={props.edit?.template || props.initial || ''}
            minHeight={100}
            showHelp
          />
        </form>
      </Modal>
    ),
  })

  return null
}
