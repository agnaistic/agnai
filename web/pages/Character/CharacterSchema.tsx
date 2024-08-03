import { Component, createEffect, createSignal, on } from 'solid-js'
import Button from '/web/shared/Button'
import { RootModal } from '/web/shared/Modal'
import { JsonSchema } from '/web/shared/JsonSchema'
import { JsonProps } from '/common/prompt'
import TextInput from '/web/shared/TextInput'
import { FormLabel } from '/web/shared/FormLabel'
import { Toggle } from '/web/shared/Toggle'
import { CharacterJsonSchema } from '/common/types/library'

export const CharacterSchema: Component<{
  inherit?: CharacterJsonSchema
  update: (next: CharacterJsonSchema) => void
}> = (props) => {
  let enabledRef: HTMLInputElement

  const [show, setShow] = createSignal(false)
  const [schema, setSchema] = createSignal<JsonProps>(props.inherit?.schema || {})
  const [response, setResponse] = createSignal(props.inherit?.response || '')
  const [hist, setHistory] = createSignal(props.inherit?.history || '')
  const [candidate, setCandidate] = createSignal<JsonProps>({})

  createEffect(
    on(
      () => props.inherit,
      (next) => {
        if (next) {
          setSchema(next.schema)
          setHistory(next.history)
          setResponse(next.response)
        }
      }
    )
  )

  const close = (save?: boolean) => {
    if (save) {
      props.update({
        enabled: enabledRef.checked,
        history: hist(),
        response: response(),
        schema: candidate(),
      })
    }

    setShow(false)
    setSchema(candidate())
  }

  return (
    <div class="w-full justify-center">
      <FormLabel
        label="Generate multiple values values in your response"
        helperText="Will only be used if your AI service supports JSON schemas"
      />
      <div class="flex gap-2">
        <Button onClick={() => setShow(true)}>Update Json Schema</Button>
        <Toggle
          ref={(r) => (enabledRef = r)}
          fieldName="jsonSchemaEnabled"
          value={props.inherit?.enabled}
        />
      </div>

      <RootModal
        show={show()}
        maxWidth="half"
        close={() => setShow(false)}
        footer={
          <>
            <Button schema="secondary" onClick={() => close(false)}>
              Cancel
            </Button>
            <Button onClick={() => close(true)}>Save</Button>
          </>
        }
      >
        <div class="flex flex-col gap-2 text-sm">
          <TextInput
            isMultiline
            fieldName="jsonSchemaResponse"
            helperText="How the message appears in your chat"
            value={props.inherit?.response}
            onInputText={(ev) => setResponse(ev)}
            placeholder="Response Template"
          />
          <TextInput
            label="History Template"
            helperMarkdown="How the message appears in a prompt"
            isMultiline
            fieldName="jsonSchemaHistory"
            value={props.inherit?.history}
            onInputText={(ev) => setHistory(ev)}
            placeholder="History Template"
          />
          <JsonSchema inherit={schema()} update={(ev) => setCandidate(ev)} />
        </div>
      </RootModal>
    </div>
  )
}
