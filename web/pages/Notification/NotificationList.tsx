import { Component, For, onMount, Show } from 'solid-js'
import PageHeader from '../../shared/PageHeader'
import { AppSchema } from '../../../srv/db/schema'
import { notificationStore } from '../../store'
import Loading from '../../shared/Loading'
import { BellRing, Check, CheckCheck } from 'lucide-solid'
import { A } from '@solidjs/router'
import Button from '../../shared/Button'

const NotificationList: Component = () => {
  const notifications = notificationStore()

  const setRead = (notification: AppSchema.Notification) => {
    // TODO
  }

  const setAllRead = () => {
    // TODO
  }

  onMount(() => {
    notificationStore.getNotifications()
  })

  return (
    <>
      <PageHeader title="Notifications" subtitle="" />

      <div class="flex w-full justify-end gap-2">
        <Button
          onClick={() =>
            notificationStore.createNotification({
              text: `Ping! ${new Date().toString()}`,
              link: '/',
            })
          }
        >
          <BellRing /> Ping!
        </Button>
        <Button onClick={() => setAllRead()}>
          <CheckCheck /> Mark all as read
        </Button>
      </div>

      <Show when={!notifications.loading} fallback={<Loading />}>
        <div class="flex w-full flex-col gap-2">
          <For each={notifications.list}>
            {(notification) => (
              <Notification notification={notification} read={() => setRead(notification)} />
            )}
          </For>
        </div>
        {!notifications.list.length ? <NoNotifications /> : null}
      </Show>
    </>
  )
}

const Notification: Component<{
  notification: AppSchema.Notification
  read: () => void
}> = (props) => {
  return (
    <div class="flex w-full gap-2">
      <div class="flex h-12 w-full flex-row items-center gap-4 rounded-xl bg-[var(--bg-800)]">
        <A
          class="ml-4 flex h-3/4 cursor-pointer items-center rounded-2xl  sm:w-9/12"
          href={`/notificationacter/${props.notification._id}/chats`}
        >
          <div class="text-lg">
            <span class="ml-2">{props.notification.text}</span>
          </div>
        </A>
      </div>
      <div class="flex flex-row items-center justify-center gap-2 sm:w-3/12">
        <a onClick={props.read}>
          <Check class="icon-button" />
        </a>
      </div>
    </div>
  )
}

const NoNotifications: Component = () => (
  <div class="mt-16 flex w-full justify-center rounded-full text-xl">Nothing to see!</div>
)

export default NotificationList
