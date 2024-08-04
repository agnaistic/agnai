import { Component, Show, createEffect, createMemo, createSignal, on } from 'solid-js'
import Button from '/web/shared/Button'
import { RootModal } from '/web/shared/Modal'
import { JsonSchema } from '/web/shared/JsonSchema'
import TextInput from '/web/shared/TextInput'
import { FormLabel } from '/web/shared/FormLabel'
import { Toggle } from '/web/shared/Toggle'
import { CharacterJsonSchema } from '/common/types/library'
import { Card, Pill, TitleCard } from '/web/shared/Card'
import { JSON_NAME_RE } from '/common/util'
import { JsonField } from '/common/prompt'
import { AutoComplete } from '/web/shared/AutoComplete'
import { characterStore } from '/web/store'

export const CharacterSchema: Component<{
  characterId?: string
  inherit?: CharacterJsonSchema
  update: (next: CharacterJsonSchema) => void
}> = (props) => {
  let enabledRef: HTMLInputElement
  let respRef: HTMLTextAreaElement
  let histRef: HTMLTextAreaElement

  const [show, setShow] = createSignal(false)
  const [schema, setSchema] = createSignal<JsonField[]>(props.inherit?.schema || [])
  const [response, setResponse] = createSignal(props.inherit?.response || '')
  const [hist, setHistory] = createSignal(props.inherit?.history || '')
  const [candidate, setCandidate] = createSignal<JsonField[]>([])
  const [auto, setAuto] = createSignal('')
  const [hotkey, setHotkey] = createSignal(false)

  const vars = createMemo(() => {
    const sch = candidate()
    return sch.map((s) => ({ label: s.name, value: s.name }))
  })

  const [resErr, setResErr] = createSignal('')
  const [histErr, setHistErr] = createSignal('')

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

  createEffect(() => {
    const resVars = response().match(JSON_NAME_RE())
    const histVars = hist().match(JSON_NAME_RE())

    const sch = candidate()
    const names = new Set(sch.map((s) => s.name))

    if (resVars) {
      const bad: string[] = []
      for (const res of resVars) {
        const name = res.slice(2, -2)
        if (!names.has(name)) {
          bad.push(name)
        }
      }
      setResErr(bad.length ? bad.join(', ') : '')
    }

    if (histVars) {
      const bad: string[] = []
      for (const res of histVars) {
        const name = res.slice(2, -2)
        if (!names.has(name)) {
          bad.push(name)
        }
      }
      setHistErr(bad.length ? bad.join(', ') : '')
    }
  })

  const onAutoComplete = (opt: { label: string }) => {
    const ref = auto() === 'history' ? histRef : auto() === 'response' ? respRef : undefined

    if (ref) {
      let prev = ref.value
      let before = prev.slice(0, ref.selectionStart - (hotkey() ? 0 : 1))
      let after = prev.slice(ref.selectionStart)

      if (before.endsWith('{{')) {
        // Do nothing
      } else if (before.endsWith('{')) {
        before = before + '{'
      } else if (!before.endsWith('{')) {
        before = before + '{{'
      }

      if (!after.startsWith('}')) {
        after = '}}' + after
      }

      const next = `${before}${opt.label}${after}`
      ref.value = next
      ref.focus()
      ref.setSelectionRange(
        before.length + opt.label.length,
        before.length + opt.label.length,
        'none'
      )
    }

    setHotkey(false)
    setAuto('')
  }

  const close = (save?: boolean) => {
    if (save) {
      const update = {
        enabled: enabledRef.checked,
        history: hist(),
        response: response(),
        schema: candidate(),
      }
      props.update(update)
      setSchema(candidate())

      if (props.characterId) {
        characterStore.editPartialCharacter(props.characterId, { json: update })
      }
    }

    setShow(false)
  }

  return (
    <div class="w-full justify-center">
      <FormLabel
        label="JSON Structured Responses"
        helperText="Request and structure responses using JSON. Only used if JSON schemas are available"
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
            <Button onClick={() => close(true)}>
              <Show when={props.characterId}>Save</Show>
              <Show when={!props.characterId}>Accept</Show>
            </Button>
          </>
        }
      >
        <div class="flex flex-col gap-2 text-sm">
          <div class="flex w-full justify-center">
            <Pill type="premium">
              This feature is in beta. Please raise bugs on Discord or GitHub.
            </Pill>
          </div>
          <Card class="relative">
            <Show when={auto() === 'response'}>
              <AutoComplete
                options={vars()}
                close={() => setAuto('')}
                dir="down"
                onSelect={onAutoComplete}
              />
            </Show>
            <TextInput
              isMultiline
              ref={(r) => (respRef = r)}
              fieldName="jsonSchemaResponse"
              label="Response Template"
              onKeyDown={(ev) => {
                if (ev.key === '{') setAuto('response')
                if (ev.ctrlKey && ev.code === 'Space') {
                  setHotkey(true)
                  setAuto('response')
                }
              }}
              helperText={
                <>
                  <div>How the message appears in your chat</div>
                  <Show when={!!resErr()}>
                    <TitleCard type="premium">
                      Template references undefined placeholders: {resErr()}
                    </TitleCard>
                  </Show>
                </>
              }
              value={props.inherit?.response}
              onInputText={(ev) => setResponse(ev)}
              placeholder="Response Template"
            />
          </Card>

          <Card class="relative">
            <Show when={auto() === 'history'}>
              <AutoComplete
                options={vars()}
                close={() => setAuto('')}
                dir="down"
                onSelect={onAutoComplete}
              />
            </Show>
            <TextInput
              ref={(r) => (histRef = r)}
              label="History Template"
              onKeyDown={(ev) => {
                if (ev.key === '{') setAuto('history')
                if (ev.ctrlKey && ev.code === 'Space') {
                  setHotkey(true)
                  setAuto('history')
                }
              }}
              helperText={
                <>
                  <>
                    <div>How the message appears in a prompt</div>
                    <Show when={!!histErr()}>
                      <TitleCard type="premium">
                        Template references undefined placeholders: {histErr()}
                      </TitleCard>
                    </Show>
                  </>
                </>
              }
              isMultiline
              fieldName="jsonSchemaHistory"
              value={props.inherit?.history}
              onInputText={(ev) => setHistory(ev)}
              placeholder="History Template"
            />
          </Card>

          <JsonSchema inherit={schema()} update={(ev) => setCandidate(ev)} />
        </div>
      </RootModal>
    </div>
  )
}
