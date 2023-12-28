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

  return (
    <>
      <PageHeader title="Preview: Chat Modes" />
      <div class="flex w-full flex-col gap-1">
        <For each={state.sessions}>
          {(sess) => (
            <Link href={toSessionUrl(sess._id)}>
              <SolidCard bg="bg-700" class="flex justify-between">
                <div>{templates()[sess.gameId]?.name}</div>
                <div>{toDuration(new Date(sess.updated))}</div>
              </SolidCard>
            </Link>
          )}
        </For>

        <Divider />
        <For each={state.templates}>
          {(each) => (
            <SolidCard>
              {each._id} {each.name}
            </SolidCard>
          )}
        </For>
      </div>
    </>
  )
}
