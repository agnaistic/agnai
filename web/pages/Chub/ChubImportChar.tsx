import { Check, X } from 'lucide-solid'
import { Component, For, Show, createEffect, createSignal } from 'solid-js'
import Button from '../../shared/Button'
import Modal from '../../shared/Modal'
import TextInput from '../../shared/TextInput'
import { NewCharacter, characterStore, toastStore } from '../../store'
import Loading from '/web/shared/Loading'
import { Pill } from '/web/shared/Card'

const ChubImportCharModal: Component<{
  show: boolean
  close: () => void
  id?: string
  char?: NewCharacter
}> = (props) => {
  let ref: any

  const [char, setChar] = createSignal<NewCharacter>(props.char!)

  createEffect(() => {
    if (!props.char) return
    setChar(props.char)
  })

  const onImport = () => {
    if (!props.char) return
    try {
      characterStore.createCharacter(props.char)
    } catch (error) {
      toastStore.error(`Error importing ${props.char.name}! ${error}`)
    }
    props.close()
  }

  return (
    <Modal
      show={props.show}
      close={props.close}
      title={
        <>
          Preview
          <a class="text-[var(--hl-500)]"> {char()?.name || '...'}</a>
        </>
      }
      maxWidth="half"
      footer={
        <>
          <Button schema="secondary" onClick={props.close}>
            <X />
            Close
          </Button>

          <Button onClick={onImport} disabled={!props.char}>
            <Check />
            Import
          </Button>
        </>
      }
    >
      <Show when={!props.char}>
        <div class="flex min-h-[12rem] w-full items-center justify-center">
          <Loading />
        </div>
      </Show>
      <Show when={props.char}>
        <form ref={ref}>
          <div class="mb-2 text-sm">
            Optionally modify all the aspects of the character other than the avatar.
          </div>
          <div class="mb-4 text-sm">
            The information provided here will be saved with the character on import.
          </div>

          <Show when={props.char?.name}>
            <TextInput
              class="text-sm"
              fieldName="name"
              label="Character Name"
              helperText={
                <span>
                  Override the name of the character here <i>(Optional)</i>
                </span>
              }
              value={char()?.name}
              onChange={(e) => setChar({ ...char(), name: e.currentTarget.value })}
            />

            <div class="my-1 flex flex-wrap justify-center gap-2">
              <For each={props.char?.tags || []}>
                {(item) => (
                  <Pill small type="hl">
                    {item}
                  </Pill>
                )}
              </For>
            </div>

            <TextInput
              isMultiline
              fieldName="greeting"
              label="Greeting"
              value={char()?.greeting}
              class="text-xs"
              onChange={(e) => setChar({ ...char(), greeting: e.currentTarget.value })}
            />

            <TextInput
              isMultiline
              fieldName="scenario"
              label="Scenario"
              value={char()?.scenario}
              class="text-xs"
              onChange={(e) => setChar({ ...char(), scenario: e.currentTarget.value })}
            />

            <TextInput
              isMultiline
              fieldName="sampleChat"
              label="Sample Chat"
              value={char()?.sampleChat}
              class="text-xs"
              onChange={(e) => setChar({ ...char(), sampleChat: e.currentTarget.value })}
            />

            <TextInput
              isMultiline
              fieldName="persona"
              label="Persona"
              value={char()?.persona.attributes.text[0]! || ''}
              class="text-xs"
              onChange={(e) => {
                setChar({
                  ...char(),
                  persona: {
                    kind: 'text',
                    attributes: {
                      text: [e.currentTarget.value],
                    },
                  },
                })
              }}
            />
          </Show>
        </form>
      </Show>
    </Modal>
  )
}

export default ChubImportCharModal
