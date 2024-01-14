import { Component, For, createEffect, createMemo, onMount } from 'solid-js'
import { sagaStore } from './state'
import { Pill, SolidCard } from '/web/shared/Card'
import { toDuration, toEntityMap } from '/web/shared/util'
import PageHeader from '/web/shared/PageHeader'
import { useNavigate } from '@solidjs/router'
import { toSessionUrl } from './Detail'
import Divider from '/web/shared/Divider'
import { markdown } from '/web/shared/markdown'
import { neat } from '/common/util'
import Button from '/web/shared/Button'
import { PlusIcon } from 'lucide-solid'

export const SagaList: Component = (props) => {
  const state = sagaStore()
  const nav = useNavigate()

  onMount(() => sagaStore.init())

  const sessions = createMemo(() => {
    const temps = toEntityMap(state.templates)
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

  const templates = createMemo(() => {
    const list = state.templates
      .map((template) => {
        const sessions = state.sessions
          .filter((s) => s.gameId === template._id && !!s.updated)
          .sort((l, r) => (l.updated === r.updated ? 0 : l.updated > r.updated ? -1 : 1))

        return {
          ...template,
          sessions,
        }
      })
      .sort((left, right) => {
        const l = left.sessions[0]?.updated || new Date(0).toISOString()
        const r = right.sessions[0]?.updated || new Date(0).toISOString()
        return r > l ? 1 : l === r ? 0 : -1
      })

    return list
  })

  createEffect(() => {
    if (!state.inited) return

    const list = sessions()
    if (list.length > 0) return

    const template = state.templates[0]
    if (!template) return

    sagaStore.newSession(template._id)
  })

  return (
    <>
      <PageHeader title="Preview: Sagas" />
      <div class="flex w-full flex-col gap-1">
        <SolidCard class="rendered-markdown">
          <div
            innerHTML={markdown.makeHtml(neat`This is a preview of "Sagas". These are open ended text-based adventures made by users.
            
            **Instructions**
            `)}
          ></div>
        </SolidCard>
        <div>
          <Button
            onClick={() => {
              sagaStore.createTemplate()
              nav(toSessionUrl('new'))
            }}
          >
            <PlusIcon /> New Template
          </Button>
        </div>
        <For each={templates()}>
          {(template) => {
            const sess = template.sessions[0]
            const url = toSessionUrl(sess?._id || 'new')
            return (
              <a
                onClick={() => {
                  if (!sess?._id) sagaStore.loadTemplate(template._id)
                  else sagaStore.loadSession(sess._id)
                  nav(url)
                }}
              >
                <SolidCard bg="bg-700" class="flex cursor-pointer justify-between">
                  <div class="font-bold">
                    <Pill small type="hl">
                      {template.sessions.length}
                    </Pill>{' '}
                    {template.name}
                  </div>
                  <div>
                    <sub>{sess ? `${toDuration(new Date(sess.updated))} ago` : 'no sessions'}</sub>
                  </div>
                </SolidCard>
              </a>
            )
          }}
        </For>

        <Divider />
      </div>
    </>
  )
}
