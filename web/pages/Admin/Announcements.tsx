import { Component, For, Match, Show, Switch, createEffect, on, onMount } from 'solid-js'
import PageHeader from '/web/shared/PageHeader'
import { Eye, EyeOff, Plus, Save } from 'lucide-solid'
import Button from '/web/shared/Button'
import TextInput, { ButtonInput } from '/web/shared/TextInput'
import { useNavigate, useParams } from '@solidjs/router'
import { announceStore, toastStore } from '/web/store'
import { elapsedSince, now } from '/common/util'
import { Toggle } from '/web/shared/Toggle'
import { toLocalTime } from '/web/shared/util'
import { Pill } from '/web/shared/Card'
import { AppSchema } from '/common/types'
import { markdown } from '/web/shared/markdown'
import { Page } from '/web/Layout'
import Select from '/web/shared/Select'
import { createStore } from 'solid-js/store'

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

const init = {
  title: '',
  content: '',
  showAt: toLocalTime(now()),
  hide: false,
  userLevel: -1,
  location: 'notification' as 'home' | 'notification',
}

const Announcement: Component<{}> = (props) => {
  const nav = useNavigate()
  const params = useParams()

  const admin = announceStore((s) => ({ item: s.admin.find((a) => a._id === params.id) }))

  const [state, setState] = createStore(
    admin.item ? { ...admin.item, showAt: toLocalTime(admin.item.showAt) } : { ...init }
  )

  createEffect(
    on(
      () => admin.item,
      (item) => {
        if (!item) return
        setState({ ...item, showAt: toLocalTime(item?.showAt) })
      }
    )
  )

  onMount(() => announceStore.getAllAdmin())

  const onSave = () => {
    const showAt = new Date(state.showAt)
    if (isNaN(showAt.valueOf())) {
      toastStore.error(`"Display At" is required`)
      return
    }
    const body = { ...state, showAt: new Date(showAt).toISOString() }

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

      <form class="flex flex-col gap-2">
        <TextInput fieldName="id" disabled value={params.id} label="ID" />

        <TextInput
          label="Title"
          value={state.title}
          onChange={(ev) => setState('title', ev.currentTarget.value)}
        />
        <Select
          items={[
            { label: 'Home', value: 'home' },
            { label: 'Notification', value: 'notification' },
          ]}
          label="Location"
          helperText="Appear on the homepage or notifications list"
          value={state.location || 'home'}
          onChange={(ev) => setState('location', ev.value as any)}
        />

        <TextInput
          type="number"
          label="User Level (Threshold)"
          helperMarkdown={
            'Announce to users with a tier level or greater `All Users = -1` `Subscribed = 0`'
          }
          value={state.userLevel}
          onChange={(ev) => setState('userLevel', +ev.currentTarget.value)}
        />

        <TextInput
          label="Content"
          value={state.content}
          isMultiline
          class="min-h-[80px]"
          onChange={(ev) => setState('content', ev.currentTarget.value)}
        />
        <Toggle fieldName="hide" label="Hide Announcement" value={state.hide} />
        <ButtonInput
          type="datetime-local"
          label="Display At"
          value={state.showAt}
          onChange={(ev) => setState('showAt', ev.currentTarget.value)}
        >
          <Button
            size="sm"
            class="mr-20 text-xs"
            schema="clear"
            onClick={() => {
              setState('showAt', toLocalTime(now()))
            }}
          >
            Now
          </Button>
        </ButtonInput>

        <div class="flex justify-end gap-2">
          <Button onClick={onSave}>
            <Save /> {params.id === 'new' ? 'Create' : 'Update'}
          </Button>
        </div>

        <div class="w-full rounded-md border-[1px] border-[var(--bg-600)] sm:w-1/2">
          <div class="flex flex-col rounded-t-md bg-[var(--hl-800)] p-2">
            <div class="text-lg font-bold">{state.title}</div>
            <div class="text-700 text-xs">{elapsedSince(new Date(state.showAt))} ago</div>
          </div>
          <div
            class="rendered-markdown bg-900 rounded-b-md p-2"
            innerHTML={markdown.makeHtml(state.content)}
          ></div>
        </div>
      </form>
    </Page>
  )
}
