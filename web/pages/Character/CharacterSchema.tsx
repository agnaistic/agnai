import { Component, Show, createEffect, createMemo, createSignal, on } from 'solid-js'
import Button from '/web/shared/Button'
import { HelpModal, RootModal } from '/web/shared/Modal'
import { JsonSchema } from '/web/shared/JsonSchema'
import TextInput from '/web/shared/TextInput'
import { FormLabel } from '/web/shared/FormLabel'
import { ResponseSchema } from '/common/types/library'
import { Card, Pill, SolidCard, TitleCard } from '/web/shared/Card'
import { JSON_NAME_RE, neat } from '/common/util'
import { JsonField } from '/common/prompt'
import { AutoComplete } from '/web/shared/AutoComplete'
import { characterStore, chatStore, presetStore, responseStore, toastStore } from '/web/store'
import { CircleHelp } from 'lucide-solid'
import { downloadJson, ExtractProps } from '/web/shared/util'
import FileInput, { getFileAsString } from '/web/shared/FileInput'
import { assertValid } from '/common/valid'
import { useAppContext } from '/web/store/context'
import { createStore } from 'solid-js/store'
import { usePresetContext } from '/web/store/preset-context'
import { AppSchema } from '/common/types'
import { Option } from '/web/shared/Select'

const helpMarkdown = neat`

**IMPORTANT**: \`{{response}}\` is a _default_ schema value. It is **ALWAYS** generated!

You can return many values using JSON schemas and control the structure of your response.
For example you could define the following fields:
- **response**: string
- **character health percentage**: number

You can then reference these fields in your **response** and **history** templates:

Response Template
\`\`\`
{{response}}
\`HP: {{character health percentage}}%\`
\`\`\`

History Template
\`\`\`
{{response}}
(User's health: {{character health percentage}}%)
\`\`\`

**Tips**:
- Use instructive fields names. This tells the AI how to generate that field.
- If a field is disabled, it won't be included in the generation.
- Order may be important. For example, if you have a multi-character schema you may name the fields like this:
-- **Steve's message to Linda**
-- **Linda's response to Steve**
`

const exampleSchema: ResponseSchema = {
  history: '{{response}}',
  response: '{{response}}',
  imageCaption: ``,
  schema: [],
}

export const CharacterSchema: Component<{
  characterId?: string
  preset?: AppSchema.GenSettings & { _id: string }
  children?: any
  update: (next: ResponseSchema) => void
}> = (props) => {
  const [ctx] = useAppContext()
  const [preset] = usePresetContext()

  let respRef: HTMLTextAreaElement
  let histRef: HTMLTextAreaElement
  let captionRef: HTMLTextAreaElement

  const [show, setShow] = createSignal(false)
  const [showImport, setShowImport] = createSignal(false)
  const [auto, setAuto] = createSignal('')
  const [hotkey, setHotkey] = createSignal(false)
  const [result, setResult] = createSignal<any>()
  const [store, setStore] = createStore({
    response: '',
    history: '',
    imageCaption: '',
    schema: [] as JsonField[],
  })

  const vars = createMemo(() => {
    const list = store.schema.reduce((prev, curr) => {
      prev.push({ label: curr.name, value: curr.name })

      if (curr.alias) {
        prev.push({ label: curr.alias, value: curr.alias })
      }

      return prev
    }, [] as Option[])
    return list
  })

  const [resErr, setResErr] = createSignal('')
  const [histErr, setHistErr] = createSignal('')
  const [captionErr, setCaptionErr] = createSignal('')

  const runSchemaTest = () => {
    setResult()
    responseStore.chatQuery(
      {
        fields: store.schema,
        assistant: 'Chat Analysis',
        question: 'Details from the above conversation:',
      },
      (resp, state, json) => {
        switch (state) {
          case 'headers': {
            if (`${resp}` === `200`) setResult('Generating...')
            break
          }

          case 'partial':
          case 'done':
            setResult(json || resp)
            return
        }
      }
    )
  }

  const saveTarget = createMemo(() => {
    if (!props.preset) return

    switch (props.preset.jsonSource) {
      case undefined:
      case 'preset':
      case 'character': {
        return { label: 'Current Preset', id: props.preset._id }
      }

      case 'json-preset': {
        return { label: 'JSON Preset', id: preset.json?._id }
      }
    }
  })

  createEffect(
    on(
      () => show(),
      (open) => {
        if (!open) return
        let json: ResponseSchema | undefined

        if (props.characterId) {
          const char = ctx.allBots[props.characterId]
          json = char ? char.json : ctx.char?.json
        } else if (props.preset) {
          switch (props.preset.jsonSource) {
            case 'character': {
              json = ctx.char?.json
              break
            }

            case undefined:
            case 'preset': {
              json = props.preset.json
              break
            }

            case 'json-preset': {
              json = preset.json?.json
              break
            }
          }
        }

        const hasValue =
          !!json?.schema?.length || !!json?.history || !!json?.response || !!json?.imageCaption
        if (json && hasValue) {
          setStore({
            schema: json.schema || [],
            history: json.history || '',
            response: json.response || '',
            imageCaption: json.imageCaption || '',
          })
        } else {
          setStore({
            history: exampleSchema.history,
            response: exampleSchema.response,
            imageCaption: exampleSchema.imageCaption,
            schema: exampleSchema.schema.slice(),
          })
        }
      }
    )
  )

  createEffect(() => {
    const resVars = store.response.match(JSON_NAME_RE())
    const histVars = store.history.match(JSON_NAME_RE())
    const captionVars = store.imageCaption.match(JSON_NAME_RE())

    const names = new Set(store.schema.map((s) => s.name))

    for (const field of store.schema) {
      if (field.alias) names.add(field.alias)
    }

    if (resVars) {
      const bad: string[] = []
      for (const res of resVars) {
        const name = res.slice(2, -2)
        if (!names.has(name) && name !== 'response') {
          bad.push(name)
        }
      }
      setResErr(bad.length ? bad.join(', ') : '')
    }

    if (histVars) {
      const bad: string[] = []
      for (const res of histVars) {
        const name = res.slice(2, -2)
        if (!names.has(name) && name !== 'response') {
          bad.push(name)
        }
      }
      setHistErr(bad.length ? bad.join(', ') : '')
    }

    if (captionVars) {
      const bad: string[] = []
      for (const res of captionVars) {
        const name = res.slice(2, -2)
        if (!names.has(name) && name !== 'response') {
          bad.push(name)
        }
      }

      setCaptionErr(bad.length ? bad.join(', ') : '')
    }
  })

  const onFieldNameChange = (from: string, to: string) => {
    const res = store.response.split(`{{${from}}}`).join(`{{${to}}}`)
    const his = store.history.split(`{{${from}}}`).join(`{{${to}}}`)

    setStore({ history: his, response: res })
  }

  const onAutoComplete =
    (field: 'history' | 'response' | 'imageCaption') => (opt: { label: string }) => {
      let ref = undefined

      switch (auto()) {
        case 'history':
          ref = histRef
          break

        case 'response':
          ref = respRef
          break

        case 'imageCaption':
          ref = captionRef
          break
      }

      const prev = store[field]

      if (ref) {
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
        setStore(field as any, next)
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

  const importSchema = (schema?: ResponseSchema) => {
    setShowImport(false)
    if (!schema) {
      return
    }

    setStore(schema)
    close(true)
  }

  const close = (save: boolean) => {
    const saveTargetId = saveTarget()
    if (save) {
      preset.json

      const update = {
        history: store.history,
        response: store.response,
        imageCaption: store.imageCaption,
        schema: store.schema,
      }

      props.update(update)

      if (ctx.chat?._id && props.characterId && props.characterId.startsWith('temp-')) {
        const char = ctx.activeMap[props.characterId]
        if (!char) {
          toastStore.error(`Could not update temp character: Could not find character data`)
        } else {
          chatStore.upsertTempCharacter(ctx.chat._id, { ...char, json: update }, () =>
            toastStore.success('Temp character JSON schema updated')
          )
        }
      } else if (props.characterId) {
        characterStore.editPartialCharacter(props.characterId, { json: update })
      } else if (saveTargetId?.id) {
        presetStore.updatePreset(saveTargetId.id, { json: update })
      }
    }

    // if (save && typeof save !== 'boolean') {
    //   props.update(save)
    //   setStore('schema', save.schema)

    //   if (props.characterId) {
    //     characterStore.editPartialCharacter(props.characterId, { json: save })
    //   } else if (saveTargetId?.id) {
    //     presetStore.updatePreset(saveTargetId.id, { json: save })
    //   }
    // }

    setHistErr('')
    setResErr('')
    setShow(false)
  }

  const filename = createMemo(() =>
    props.characterId
      ? `schema-char-${props.characterId.slice(0, 4)}`
      : props.preset
      ? `schema-preset-${props.preset._id.slice(0, 4)}`
      : 'schema'
  )

  return (
    <div class="w-full justify-center">
      <FormLabel
        label={
          <div class="flex justify-between">
            <div>JSON Structured Responses</div>
            <div class="flex gap-1">
              <Button size="pill" schema="secondary" onClick={() => setShowImport(true)}>
                Import
              </Button>
              <Show when={store.schema.length}>
                <Button
                  size="pill"
                  schema="secondary"
                  onClick={() => downloadJson(store, filename())}
                >
                  Export
                </Button>
              </Show>
            </div>
          </div>
        }
        helperText="Request and structure responses using JSON. Only used if JSON schemas are available"
      />

      <div class="flex items-center gap-2">
        <Button onClick={() => setShow(true)}>Update Schema</Button>
        {props.children}
      </div>

      <Show when={show()}>
        <RootModal
          title={
            <>
              Editing Schema
              <div class="text-600 !text-[1rem] font-normal">
                <Show when={props.characterId} fallback={saveTarget()?.label}>
                  {ctx.allBots[props.characterId!]?.name || 'Character'}
                </Show>
              </div>
            </>
          }
          show={show()}
          maxWidth="half"
          close={() => setShow(false)}
          footer={
            <div class="flex w-full justify-between">
              <div>
                <Button onClick={runSchemaTest}>Test Schema</Button>
              </div>
              <div class="flex gap-2">
                <Button schema="secondary" onClick={() => close(false)}>
                  Cancel
                </Button>
                <Button onClick={() => close(true)}>Save</Button>
              </div>
            </div>
          }
        >
          <div class="flex flex-col gap-2 text-sm">
            <div class="flex w-full justify-center gap-2">
              <Pill type="premium">Warning: Not all models support JSON Output/Responses.</Pill>

              <HelpModal
                title="Information"
                cta={
                  <Button size="sm">
                    <CircleHelp size={24} /> Guide
                  </Button>
                }
                markdown={helpMarkdown}
              />
            </div>

            <Card class="relative">
              <Show when={auto() === 'response'}>
                <AutoComplete
                  options={vars()}
                  close={() => setAuto('')}
                  dir="down"
                  onSelect={onAutoComplete('response')}
                />
              </Show>
              <TextInput
                isMultiline
                fieldName="jsonSchemaResponse"
                label={<b>Response Template</b>}
                ref={(r) => (respRef = r)}
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
                      <TitleCard type="rose">
                        Template references undefined placeholders: {resErr()}
                      </TitleCard>
                    </Show>
                  </>
                }
                value={store.response}
                placeholder="Response Template"
                class="font-mono text-xs"
                onChange={(ev) => setStore('response', ev.currentTarget.value)}
              />
            </Card>

            <Card class="relative">
              <Show when={auto() === 'history'}>
                <AutoComplete
                  options={vars()}
                  close={() => setAuto('')}
                  dir="down"
                  onSelect={onAutoComplete('history')}
                />
              </Show>
              <TextInput
                class="font-mono text-xs"
                fieldName="jsonSchemaHistory"
                label={<b>History Template</b>}
                ref={(r) => (histRef = r)}
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
                        <TitleCard type="rose">
                          Template references undefined placeholders: {histErr()}
                        </TitleCard>
                      </Show>
                    </>
                  </>
                }
                isMultiline
                value={store.history}
                placeholder="History Template"
                onChange={(ev) => setStore('history', ev.currentTarget.value)}
              />
            </Card>

            <Card class="relative">
              <Show when={auto() === 'imageCaption'}>
                <AutoComplete
                  options={vars()}
                  close={() => setAuto('')}
                  dir="down"
                  onSelect={onAutoComplete('imageCaption')}
                />
              </Show>
              <TextInput
                class="font-mono text-xs"
                fieldName="jsonSchemaImageCaption"
                label={<b>Image Caption Template</b>}
                ref={(r) => (captionRef = r)}
                onKeyDown={(ev) => {
                  if (ev.key === '{') setAuto('imageCaption')
                  if (ev.ctrlKey && ev.code === 'Space') {
                    setHotkey(true)
                    setAuto('imageCaption')
                  }
                }}
                helperText={
                  <>
                    <>
                      <div>Used to auto-populate the "Image Prompt" for image generation.</div>
                      <Show when={!!captionErr()}>
                        <TitleCard type="rose">
                          Template references undefined placeholders: {captionErr()}
                        </TitleCard>
                      </Show>
                    </>
                  </>
                }
                isMultiline
                value={store.imageCaption}
                placeholder="Image Caption Template"
                onChange={(ev) => setStore('imageCaption', ev.currentTarget.value)}
              />
            </Card>

            <Show
              when={
                !store.history.includes('{{response}}') || !store.response.includes('{{response}}')
              }
            >
              <SolidCard type="orange">
                <b>Warning:</b> <code>{'{{response}}'}</code> is not included in your history or
                response template. The <b>{'{{response}}'}</b> field is always generated and is
                highly recommended to be used.
              </SolidCard>
            </Show>

            <JsonSchema
              inherit={store.schema}
              update={(ev) => setStore('schema', ev)}
              onNameChange={onFieldNameChange}
            />

            <Show when={result()}>
              <code class="whitespace-pre-wrap">{JSON.stringify(result(), null, 2)}</code>
            </Show>
          </div>
        </RootModal>
      </Show>

      <ImportModal show={showImport()} close={importSchema} />
    </div>
  )
}

const ImportModal: Component<{ show: boolean; close: (schema?: ResponseSchema) => void }> = (
  props
) => {
  const onUpdate: ExtractProps<typeof FileInput>['onUpdate'] = async (files) => {
    const file = files[0]
    if (!file) return

    let curr: any
    try {
      const content = await getFileAsString(file)
      const json = JSON.parse(content)

      curr = json
      assertValid(
        {
          response: 'string',
          history: 'string',
          imageCaption: 'string?',
          fields: ['any?'],
          schema: ['any?'],
          separateCall: 'boolean?',
        },
        json
      )

      const schema = curr.fields || curr.schema

      for (const field of schema) {
        curr = field
        assertValid({ type: { type: 'string' }, name: 'string' }, field)
      }

      props.close({
        response: json.response,
        history: json.history,
        imageCaption: json.imageCaption || '',
        schema,
      })
    } catch (ex: any) {
      toastStore.error(`Invalid JSON Schema: ${ex.message}`)
      console.error(ex)
      console.log('Failed at', JSON.stringify(curr))
    }
  }

  return (
    <RootModal
      show={props.show}
      close={props.close}
      footer={
        <>
          <Button schema="secondary" onClick={() => props.close()}>
            Close
          </Button>
        </>
      }
    >
      <FileInput
        fieldName="import-schema"
        accept="text/json,application/json"
        label="JSON Schema File (.json)"
        onUpdate={onUpdate}
      />
    </RootModal>
  )
}
