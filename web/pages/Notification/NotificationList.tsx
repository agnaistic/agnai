import { Component, For, onMount, Show } from 'solid-js'
import PageHeader from '../../shared/PageHeader'
import { NotificationData, notificationStore } from '../../store'
import Loading from '../../shared/Loading'
import { Bell, BellRing, Check, ListChecks, Minus } from 'lucide-solid'
import { useNavigate } from '@solidjs/router'
import Button from '../../shared/Button'
import { toDuration } from '../../shared/util'

const NotificationList: Component = () => {
  const notifications = notificationStore()

  const setRead = (notification: NotificationData) => {
    notificationStore.readNotification(notification._id)
  }

  const setAllRead = () => {
    notificationStore.readAllNotifications()
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
              text: 'Ping!',
              link: '/',
            })
          }
        >
          <BellRing /> Ping!
        </Button>
        <Button onClick={() => setAllRead()}>
          <ListChecks /> Mark all as read
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
  notification: NotificationData
  read: () => void
}> = (props) => {
  const nav = useNavigate()

  return (
    <div class="flex w-full gap-2">
      <div
        class="flex h-12 w-full cursor-pointer flex-row items-center gap-2 rounded-xl bg-[var(--bg-800)] hover:bg-[var(--bg-700)]"
        onClick={() => nav(props.notification.link ?? '/')}
      >
        <div
          class="flex w-1/2 items-center gap-2 sm:w-9/12"
          classList={{ 'text-500': props.notification.read }}
        >
          <Bell size={16} class="ml-2" />
          {props.notification.text}
        </div>
        <div class="hidden w-1/2  justify-between sm:flex sm:w-3/12">
          <div class="text-sm">{toDuration(new Date(props.notification.createdAt))} ago</div>
        </div>
      </div>
      <Show when={!props.notification.read}>
        <div class="flex items-center" onClick={props.read}>
          <Check size={16} class="icon-button" />
        </div>
      </Show>
      <Show when={props.notification.read}>
        <div class="flex items-center">
          <Minus size={16} />
        </div>
      </Show>
    </div>
  )
}

const NoNotifications: Component = () => (
  <div class="mt-16 flex w-full justify-center rounded-full text-xl">Nothing to see!</div>
)

export default NotificationList
