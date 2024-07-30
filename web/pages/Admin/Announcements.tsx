import {
  Component,
  For,
  Match,
  Show,
  Switch,
  createEffect,
  createSignal,
  on,
  onMount,
} from 'solid-js'
import PageHeader from '/web/shared/PageHeader'
import { Eye, EyeOff, Plus, Save } from 'lucide-solid'
import Button from '/web/shared/Button'
import TextInput, { ButtonInput } from '/web/shared/TextInput'
import { useNavigate, useParams } from '@solidjs/router'
import { announceStore, toastStore } from '/web/store'
import { elapsedSince, now } from '/common/util'
import { Toggle } from '/web/shared/Toggle'
import { getStrictForm, toLocalTime } from '/web/shared/util'
import { Pill } from '/web/shared/Card'
import { AppSchema } from '/common/types'
import { markdown } from '/web/shared/markdown'
import { Page } from '/web/Layout'
import Select from '/web/shared/Select'

export { AnnoucementPage as default }

const AnnoucementPage: Component = () => {
  const params = useParams()

  return (
    <Switch>
      <Match when={!params.id}>
        <AnnoucementList />
      </Match>

      <Match when={!!params.id}>
        <Announcement />
      </Match>
    </Switch>
  )
}

const AnnoucementList: Component = (props) => {
  const state = announceStore()
  const nav = useNavigate()

  onMount(() => {
    announceStore.getAllAdmin()
  })

  const hide = (id: string) => {
    announceStore.update(id, { hide: true })
  }

  const unhide = (id: string) => {
    announceStore.update(id, { hide: false })
  }

  return (
    <Page>
      <PageHeader title="Manage Announcements" />
      <div class="flex w-full justify-end">
        <Button onClick={() => nav('/admin/announcements/new')}>
          Create <Plus />
        </Button>
      </div>

      <div class="mt-2 flex w-full flex-col gap-2">
        <For each={state.admin}>
          {(item) => (
            <div class="flex items-center gap-2">
              <div
                class="flex w-full cursor-pointer items-center justify-between rounded-lg p-3 hover:bg-[var(--bg-700)]"
                classList={{
                  hidden: !!item.deletedAt,
                  'bg-900': item.hide,
                  'bg-[var(--hl-700)]': !item.hide && item.showAt >= now(),
                  'bg-800': !item.hide && item.showAt < now(),
                }}
                onClick={() => nav(`/admin/announcements/${item._id}`)}
              >
                <div class="font-bold">
                  {item.title}{' '}
                  <span class="text-500 text-xs font-light italic">
                    {item.location === 'notification' ? 'notify' : 'home'}
                  </span>
                </div>
                <div class="flex gap-1">
                  <Pill inverse>Created: {new Date(item.showAt).toLocaleString()}</Pill>
                  <Pill inverse>{elapsedSince(new Date(item.showAt))} ago</Pill>
                  {Label(item)}
                </div>
              </div>
              <div class="flex min-w-fit gap-2">
                <Show when={!item.hide}>
                  <Button onClick={() => hide(item._id)}>
                    <Eye /> Hide
                  </Button>
                </Show>

                <Show when={item.hide}>
                  <Button schema="gray" onClick={() => unhide(item._id)}>
                    <EyeOff /> Unhide
                  </Button>
                </Show>
              </div>
            </div>
          )}
        </For>
      </div>
    </Page>
  )
}

function Label(item: AppSchema.Announcement) {
  const date = new Date(item.showAt)

  if (item.deletedAt) return <Pill type="rose">Deleted</Pill>
  if (item.hide) return <Pill type="coolgray">Hidden</Pill>
  if (date.valueOf() >= Date.now()) return <Pill type="premium">Pending</Pill>
  return (
    <Pill inverse type="green">
      Active
    </Pill>
  )
}

const Announcement: Component<{}> = (props) => {
  let ref: HTMLFormElement
  let showAtRef: HTMLInputElement

  const nav = useNavigate()
  const params = useParams()

  const state = announceStore((s) => ({ item: s.admin.find((a) => a._id === params.id) }))

  const [title, setTitle] = createSignal(state.item?.title || '')
  const [content, setContent] = createSignal(state.item?.content || '')
  const [showAt, setShowAt] = createSignal(new Date(state.item?.showAt || now()))

  onMount(() => {
    announceStore.getAllAdmin()
  })

  createEffect(
    on(
      () => (state.item?.title || '') + (state.item?.content || ''),
      () => {
        if (state.item?.title) {
          setTitle(state.item?.title)
        }
        if (state.item?.content) {
          setContent(state.item.content)
        }
      }
    )
  )

  const onSave = () => {
    const body = getStrictForm(ref, {
      title: 'string',
      content: 'string',
      hide: 'boolean',
      showAt: 'string',
      location: ['home', 'notification'],
    })

    const showAt = new Date(body.showAt)
    if (isNaN(showAt.valueOf())) {
      toastStore.error(`"Display At" is required`)
      return
    }

    body.showAt = showAt.toISOString()

    if (params.id === 'new') {
      announceStore.create(body, (announce) => {
        nav(`/admin/announcements/${announce._id}`)
      })
    } else {
      announceStore.update(params.id, body)
    }
  }

  return (
    <Page>
      <PageHeader title="Announcement" />

      <form ref={ref!} class="flex flex-col gap-2">
        <TextInput fieldName="id" disabled value={params.id} label="ID" />

        <TextInput
          fieldName="title"
          label="Title"
          value={state.item?.title}
          onInput={(ev) => setTitle(ev.currentTarget.value)}
        />
        <Select
          fieldName="location"
          items={[
            { label: 'Home', value: 'home' },
            { label: 'Notification', value: 'notification' },
          ]}
          label="Location"
          helperText="Appear on the homepage or notifications list"
          value={state.item?.location || 'home'}
        />
        <TextInput
          fieldName="content"
          label="Content"
          value={state.item?.content}
          isMultiline
          class="min-h-[80px]"
          onInput={(ev) => setContent(ev.currentTarget.value)}
        />
        <Toggle fieldName="hide" label="Hide Announcement" value={state.item?.hide} />
        <ButtonInput
          ref={(r) => (showAtRef = r)}
          fieldName="showAt"
          type="datetime-local"
          label="Display At"
          value={state.item?.showAt ? toLocalTime(state.item.showAt) : toLocalTime(now())}
          onChange={(ev) => setShowAt(new Date(ev.currentTarget.value))}
        >
          <Button
            size="sm"
            class="mr-20 text-xs"
            schema="clear"
            onClick={() => {
              const time = toLocalTime(now())
              setShowAt(new Date(time))
              showAtRef.value = time
            }}
          >
            Now
          </Button>
        </ButtonInput>

        {/* <TextInput
          type="datetime-local"
          label="Display At"
          fieldName="showAt"
          value={state.item?.showAt ? toLocalTime(state.item.showAt) : toLocalTime(now())}
          onChange={(ev) => setShowAt(new Date(ev.currentTarget.value))}
        /> */}

        <div class="flex justify-end gap-2">
          <Button onClick={onSave}>
            <Save /> {params.id === 'new' ? 'Create' : 'Update'}
          </Button>
        </div>

        <div class="w-full rounded-md border-[1px] border-[var(--bg-600)] sm:w-1/2">
          <div class="flex flex-col rounded-t-md bg-[var(--hl-800)] p-2">
            <div class="text-lg font-bold">{title()}</div>
            <div class="text-700 text-xs">{elapsedSince(showAt())} ago</div>
          </div>
          <div
            class="rendered-markdown bg-900 rounded-b-md p-2"
            innerHTML={markdown.makeHtml(content())}
          ></div>
        </div>
      </form>
    </Page>
  )
}
