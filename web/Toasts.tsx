import { Component, For, Show, createEffect, createMemo, createSignal, on, onMount } from 'solid-js'
import { Toast, toastStore } from './store/toasts'
import Modal from './shared/Modal'
import { SolidCard, TitleCard } from './shared/Card'
import Button from './shared/Button'
import WizardIcon from './icons/WizardIcon'
import InvitesPage from './pages/Invite/InvitesPage'
import Divider from './shared/Divider'
import { announceStore, userStore } from './store'
import { AppSchema } from '/common/types'
import { markdown } from './shared/markdown'
import { elapsedSince } from './shared/util'

const bgColor = {
  default: 'bg-500',
  error: 'bg-red-600',
  success: 'bg-green-600',
  warn: 'bg-orange-600',
  admin: 'bg-blue-600',
} satisfies { [key in Toast['type']]: string }

const Notifications: Component = () => {
  const announce = announceStore()
  const user = userStore()
  const state = toastStore()

  const bookmark = createMemo(() => new Date(user.user?.announcement || Date.now()))
  const [read, setRead] = createSignal('')

  onMount(() => {
    announceStore.getAll()
  })

  createEffect(
    on(
      () => state.modal,
      (open) => {
        if (!open) {
          const readTime = read()
          if (!readTime) return
          setRead('')
          userStore.updatePartialConfig({ announcement: readTime }, true)
          return
        }
        announceStore.getAll()
        setRead(new Date().toISOString())
        return open
      }
    )
  )

  const all = createMemo(() => {
    return announce.list
      .filter((ann) => ann.location === 'notification')
      .slice(0, 8)
      .sort((l, r) => r.showAt.localeCompare(l.showAt))
  })

  const unseen = createMemo(() => {
    return all().filter(
      (ann) => ann.location === 'notification' && ann.showAt > bookmark().toISOString()
    )
  })

  const seen = createMemo(() => {
    return all().filter(
      (ann) => ann.location === 'notification' && ann.showAt <= bookmark().toISOString()
    )
  })

  return (
    <>
      <div class="absolute bottom-2 right-2 flex max-w-[20rem] flex-col gap-2">
        <For each={state.toasts}>{(toast) => <Single toast={toast} />}</For>
      </div>

      <Show when={state.modal}>
        <Modal
          title={'Site Updates and Notifications'}
          show={state.modal}
          close={() => toastStore.modal(false)}
          maxWidth="half"
          ariaLabel="Notifications"
          maxHeight
        >
          <div class="flex flex-col gap-3">
            <InvitesPage />
            <SolidCard border class="mt-2 flex flex-col gap-2 font-bold">
              <Show when={state.history.length === 0}>You have no notifications.</Show>
              <Show when={state.history.length > 0}>
                <div class="flex justify-center">
                  <Button
                    onClick={() => {
                      toastStore.clearHistory()
                      toastStore.modal(false)
                    }}
                  >
                    Clear Notifications
                  </Button>
                </div>
                <For each={state.history}>
                  {({ time, toast, seen }) => (
                    <TitleCard
                      type={
                        toast.type === 'admin'
                          ? 'blue'
                          : toast.type === 'error'
                          ? 'rose'
                          : toast.type === 'warn'
                          ? 'orange'
                          : 'bg'
                      }
                    >
                      <p>
                        <em>{time.toLocaleString()}</em>
                      </p>
                      <Show when={toast.type === 'admin'}>
                        <b>Message from Administrator</b>
                      </Show>
                      <p>{toast.message}</p>
                    </TitleCard>
                  )}
                </For>
              </Show>
            </SolidCard>

            <SiteUpdates seen={seen()} unseen={unseen()} />
          </div>
        </Modal>
      </Show>
    </>
  )
}

const SiteUpdates: Component<{
  seen: AppSchema.Announcement[]
  unseen: AppSchema.Announcement[]
}> = (props) => {
  return (
    <div class="mt-2 flex flex-col gap-2">
      <div class="text-xl font-bold">Latest Updates</div>
      <Show when={props.unseen.length > 0}>
        <For each={props.unseen}>{(item) => <Update announcement={item} />}</For>
        <Divider />
      </Show>
      <For each={props.seen}>{(item) => <Update announcement={item} seen />}</For>
    </div>
  )
}

const Update: Component<{ announcement: AppSchema.Announcement; seen?: boolean }> = (props) => {
  const markup = createMemo(() => markdown.makeHtml(props.announcement.content))
  return (
    <TitleCard
      title={
        <div class="flex w-full justify-between gap-2">
          <div>{props.announcement.title} </div>
          <div class="text-700 text-[10px] font-normal">
            {elapsedSince(props.announcement.showAt)} ago
          </div>
        </div>
      }
      type={props.seen ? 'bg' : 'hl'}
      bg={props.seen ? 'bg-700' : undefined}
      contentClass="bg-800"
    >
      <div class="markdown" innerHTML={markup()}></div>
    </TitleCard>
  )
}

const Single: Component<{ toast: Toast }> = (props) => {
  const bg = bgColor[props.toast.type]
  const onClick = () => toastStore.remove(props.toast.id)
  return (
    <div class="flex flex-row justify-end">
      <div class={`${bg} w-2 rounded-l-md`}></div>
      <div class={`bg-700 cursor-pointer rounded-r-md p-2`} onClick={onClick}>
        <div class="flex flex-col gap-1">
          <Show when={props.toast.type === 'admin'}>
            <div class="flex gap-1 font-bold">
              <WizardIcon color="var(--blue-500)" />
              Admin Notifcation
            </div>
          </Show>

          <div>{props.toast.message}</div>
        </div>
      </div>
    </div>
  )
}

export default Notifications
