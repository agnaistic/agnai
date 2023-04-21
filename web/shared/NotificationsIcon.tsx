import { Bell } from 'lucide-solid'
import { Component, Show, createEffect } from 'solid-js'
import { notificationStore, userStore } from '../store'
import { A } from '@solidjs/router'

const NotificationsIcon: Component = (props) => {
  const loggedInState = userStore((x) => ({ loggedIn: x.loggedIn }))
  const notifications = notificationStore((x) => ({ count: x.list.filter((n) => !n.read).length }))
  let loaded = false

  createEffect(() => {
    if (loggedInState.loggedIn && !loaded) {
      loaded = true
      notificationStore.getNotifications()
    }
  })

  return (
    <>
      <Show when={loggedInState.loggedIn}>
        <A href="/notification/list">
          <div class="relative">
            <Bell />
            <Show when={notifications.count}>
              <div
                class="absolute flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs text-white"
                style="top: -0.35rem; right: -0.35rem;"
              >
                {notifications.count}
              </div>
            </Show>
          </div>
        </A>
      </Show>
    </>
  )
}

export default NotificationsIcon
