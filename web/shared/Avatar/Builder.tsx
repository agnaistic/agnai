import { Component, Show, createMemo, createSignal, onCleanup, onMount } from 'solid-js'
import { attributes, getRandomBody, manifest } from '/web/asset/sprite'
import PageHeader from '../PageHeader'
import Button from '../Button'
import { ArrowLeft, ArrowRight, Dices } from 'lucide-solid'
import Select from '../Select'
import { createDebounce } from '../util'
import { ColorPickerV2 } from '../ColorPicker'
import { FullSprite, SpriteAttr } from '/common/types/sprite'
import { calcBounds, getAttrColor, getColorProp } from './hooks'
import AvatarCanvas from './Canvas'
import { Page } from '/web/Layout'

const AvatarBuilder: Component<{
  body?: FullSprite
  resize?: boolean
  onChange?: (body: FullSprite) => void
  bounds?: HTMLElement
  noHeader?: boolean
}> = (props) => {
  let bound: HTMLElement = {} as any

  const [body, setBody] = createSignal(props.body || getRandomBody())
  const [base, setBase] = createSignal({ w: 500, h: 600 })
  const [bounds, setBounds] = createSignal({ w: 0, h: 0 })
  const [attr, setAttr] = createSignal(attributes[0])

  const calculateBounds = () => {
    const width = props.bounds?.clientWidth || bound.clientWidth
    const height = props.bounds?.clientHeight || bound.clientHeight

    return calcBounds(width, height)
  }

  const [obs] = createSignal(
    new ResizeObserver(() => {
      setBase(calculateBounds())
      setBounds(base())
    })
  )

  onMount(() => {
    obs().observe(props.bounds || bound)
    setBase(calculateBounds())
    setBounds(base())
  })

  onCleanup(() => {
    obs().disconnect()
  })

  const getStyle = createMemo(() => {
    const max = bounds()
    return { width: max.w + 'px', height: max.h + 'px' }
  })

  const updateAttr = <T extends keyof FullSprite>(attr: T, type: FullSprite[T]) => {
    const next = { ...body(), [attr]: type }
    setBody(next)
    props.onChange?.(body())
  }

  const [handleColor, disposeColor] = createDebounce((hex: string) => {
    const prop = getColorProp(attr())
    if (!prop) return
    updateAttr(prop, hex)
  }, 16)

  onCleanup(() => {
    disposeColor()
  })

  return (
    <Page>
      <Show when={!props.noHeader}>
        <PageHeader title="Character Builder" />
      </Show>
      <div class="flex select-none justify-center">
        <main class="flex w-full flex-col">
          <header class={`mt-2 flex w-full flex-col items-center gap-2`}>
            <div class="flex w-full justify-between gap-2">
              <AttributeSelect body={body()} update={updateAttr} />
            </div>
            <div class="flex w-full justify-between">
              <div class="flex items-center gap-2">
                <Select
                  class="w-24"
                  items={[
                    { label: 'hair color', value: 'front_hair' },
                    { label: 'eye color', value: 'eyes' },
                    { label: 'body color', value: 'body' },
                  ]}
                  onChange={(v) => setAttr(v.value as any)}
                  fieldName=""
                />
                <ColorPickerV2
                  onInput={handleColor}
                  onChange={handleColor}
                  value={getAttrColor(body(), attr())}
                />
              </div>
              <div class="flex gap-2">
                <Button
                  class="px-4"
                  onClick={() => setBody(getRandomBody({ gender: body().gender }))}
                >
                  <Dices size={16} />
                </Button>
                <Button
                  class="h-8 px-4"
                  onClick={() => updateAttr('gender', body().gender === 'male' ? 'female' : 'male')}
                >
                  Body
                </Button>
              </div>
            </div>
          </header>

          <section
            ref={bound!}
            class={`relative flex h-full min-h-[50vh] w-full select-none justify-center border-[1px] border-[var(--bg-900)]`}
          >
            <AvatarCanvas body={body()} style={getStyle()} />
          </section>
        </main>
      </div>
    </Page>
  )
}

const AttributeSelect: Component<{
  body: FullSprite
  update: (attr: SpriteAttr, type: string) => void
}> = (props) => {
  const [attr, setAttr] = createSignal(attributes[0])

  const options = createMemo(() => {
    return attributes
      .slice()
      .sort()
      .map((value) => ({ label: value.replace(/_/g, ' '), value }))
  })

  const types = createMemo(() => {
    const opts = manifest.attributes[attr()]
    return opts.map((name) => ({ value: name, label: name.replace(/_/g, ' ') }))
  })

  const move = (dir: -1 | 1) => {
    const opts = manifest.attributes[attr()]
    let curr = opts.indexOf(props.body[attr()]) + dir

    if (curr < 0) curr = opts.length - 1
    if (curr >= opts.length) curr = 0

    props.update(attr(), opts[curr])
  }

  return (
    <div class="flex gap-2">
      <Select
        class="w-24"
        fieldName="attribute"
        items={options()}
        value={attr()}
        onChange={(value) => setAttr(value.value as any)}
      />
      <Select
        class="w-24"
        fieldName="type"
        items={types()}
        value={props.body[attr()]}
        onChange={(opt) => props.update(attr(), opt.value)}
      />
      <Button schema="hollow" onClick={() => move(-1)}>
        <ArrowLeft size={16} />
      </Button>
      <Button schema="hollow" onClick={() => move(1)}>
        <ArrowRight size={16} />
      </Button>
    </div>
  )
}

export default AvatarBuilder
