import { Check, X } from 'lucide-solid'
import { Component, Show, createEffect, createSignal } from 'solid-js'
import Button from '../../shared/Button'
import Modal from '../../shared/Modal'
import TextInput from '../../shared/TextInput'
import { NewCharacter, characterStore, toastStore } from '../../store'

const ChubImportCharModal: Component<{
  show: boolean
  close: () => void
  id?: string
  char: NewCharacter
  fullPath: string
}> = (props) => {
  let ref: any

  const [char, setChar] = createSignal<NewCharacter>(props.char)

  const onImport = () => {
    try {
      characterStore.createCharacter(char())
    } catch (error) {
      toastStore.error(`Error importing ${char()?.name}! ${error}`)
    }
    props.close()
  }

  createEffect(() => {
    if (props.char) {
      setChar(props.char)
    }
  })

  return (
    <Modal
      show={props.show}
      close={props.close}
      title={
        <>
          Preview
          <a href={`https://chub.ai/characters/${props.fullPath}`} class="text-[var(--hl-500)]">
            {' '}
            {char()?.name}
          </a>
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
      <form ref={ref}>
        <div class="mb-2 text-sm">
          Optionally modify all the aspects of the character other than the avatar.
        </div>
        <div class="mb-4 text-sm">
          The information provided here will be saved with the character on import.
        </div>

        <Show when={char()?.name}>
          <TextInput
            class="text-sm"
            fieldName="name"
            label="Character Name"
            helperText={
              <span>
                Override the name of the character here <i>(Optional)</i>
              </span>
            }
            value={char().name}
            onChange={(e) => {
              setChar({
                ...char(),
                name: e.currentTarget.value,
              })
            }}
          />
          <TextInput
            isMultiline
            fieldName="greeting"
            label="Greeting"
            value={char()?.greeting}
            class="text-xs"
            onKeyUp={(e) => {
              setChar({
                ...char(),
                greeting: e.currentTarget.value,
              })
            }}
          />

          <TextInput
            isMultiline
            fieldName="scenario"
            label="Scenario"
            value={char().scenario}
            class="text-xs"
            onKeyUp={(e) => {
              setChar({
                ...char(),
                scenario: e.currentTarget.value,
              })
            }}
          />

          <TextInput
            isMultiline
            fieldName="sampleChat"
            label="Sample Chat"
            value={char().sampleChat}
            class="text-xs"
            onKeyUp={(e) => {
              setChar({
                ...char(),
                sampleChat: e.currentTarget.value,
              })
            }}
          />

          <TextInput
            isMultiline
            fieldName="persona"
            label="Persona"
            value={char().persona.attributes.text[0]! || ''}
            class="text-xs"
            onKeyUp={(e) => {
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
    </Modal>
  )
}

export default ChubImportCharModal
