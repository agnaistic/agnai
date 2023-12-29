import { Component, For, createEffect, createMemo, onMount } from 'solid-js'
import { gameStore } from './state'
import { SolidCard } from '/web/shared/Card'
import { toDuration, toEntityMap } from '/web/shared/util'
import PageHeader from '/web/shared/PageHeader'
import { Link } from '@solidjs/router'
import { toSessionUrl } from './Detail'
import Divider from '/web/shared/Divider'

export const AdventureList: Component = (props) => {
  const state = gameStore()

  onMount(() => {
    gameStore.init()
  })

  createEffect(() => {
    if (!state.inited) return
    if (state.sessions.length > 0) return

    const template = state.templates[0]
    if (!template) return

    gameStore.newSession(template._id, (id) => {})
  })

  const templates = createMemo(() => {
    return toEntityMap(state.templates)
  })

  const sessions = createMemo(() => {
    const temps = templates()
    const list = state.sessions
      .filter((s) => {
        if (!s.updated) return false
        if (s.gameId in temps === false) return false
        return true
      })
      .map((s) => {
        return {
          session: s,
          template: temps[s.gameId],
          url: toSessionUrl(s._id),
          updated: new Date(s.updated),
        }
      })
    return list
  })

  return (
    <>
      <PageHeader title="Preview: Chat Modes" />
      <div class="flex w-full flex-col gap-1">
        <For each={sessions()}>
          {(sess) => (
            <Link href={sess.url}>
              <SolidCard bg="bg-700" class="flex justify-between">
                <div class="font-bold">{sess.template.name}</div>
                <div>
                  <sub>{toDuration(new Date(sess.updated))} ago</sub>
                </div>
              </SolidCard>
            </Link>
          )}
        </For>

        <Divider />
      </div>
    </>
  )
}
