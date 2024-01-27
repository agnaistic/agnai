import { Check, X } from 'lucide-solid'
import { Component, Show, createEffect, createSignal } from 'solid-js'
import Button from '../../shared/Button'
import Modal from '../../shared/Modal'
import TextInput from '../../shared/TextInput'
import { NewCharacter, characterStore, toastStore } from '../../store'
import Loading from '/web/shared/Loading'
import { Trans, useTransContext } from '@mbarzda/solid-i18next'

const ChubImportCharModal: Component<{
  show: boolean
  close: () => void
  id?: string
  char?: NewCharacter
}> = (props) => {
  const [t] = useTransContext()

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
      toastStore.error(
        t('error_importing_name_x_message_x', { name: props.char.name, message: error })
      )
    }
    props.close()
  }

  return (
    <Modal
      show={props.show}
      close={props.close}
      title={
        <>
          {t('preview')}
          <a class="text-[var(--hl-500)]"> {char()?.name || '...'}</a>
        </>
      }
      maxWidth="half"
      footer={
        <>
          <Button schema="secondary" onClick={props.close}>
            <X />
            {t('close')}
          </Button>

          <Button onClick={onImport} disabled={!props.char}>
            <Check />
            {t('import')}
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
          <div class="mb-2 text-sm">{t('optionally_modify_all_the_aspects_of_the_character')}</div>
          <div class="mb-4 text-sm">
            {t('the_information_provided_here_will_be_saved_with_the_character')}
          </div>

          <Show when={props.char?.name}>
            <TextInput
              class="text-sm"
              fieldName="name"
              label="Character Name"
              helperText={
                <span>
                  <Trans key="override_the_name_of_the_character">
                    Override the name of the character here <i>(Optional)</i>
                  </Trans>
                </span>
              }
              value={char()?.name}
              onChange={(e) => setChar({ ...char(), name: e.currentTarget.value })}
            />
            <TextInput
              isMultiline
              fieldName="greeting"
              label={t('greeting')}
              value={char()?.greeting}
              class="text-xs"
              onKeyUp={(e) => setChar({ ...char(), greeting: e.currentTarget.value })}
            />

            <TextInput
              isMultiline
              fieldName="scenario"
              label={t('scenario')}
              value={char()?.scenario}
              class="text-xs"
              onKeyUp={(e) => setChar({ ...char(), scenario: e.currentTarget.value })}
            />

            <TextInput
              isMultiline
              fieldName="sampleChat"
              label={t('sample_chat')}
              value={char()?.sampleChat}
              class="text-xs"
              onKeyUp={(e) => setChar({ ...char(), sampleChat: e.currentTarget.value })}
            />

            <TextInput
              isMultiline
              fieldName="persona"
              label={t('persona')}
              value={char()?.persona.attributes.text[0]! || ''}
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
      </Show>
    </Modal>
  )
}

export default ChubImportCharModal
