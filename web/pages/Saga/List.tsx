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
import { SagaSession } from '/web/store/data/saga'

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
            if (!template.sessions.length) return null

            return (
              <SolidCard bg="bg-700" class="flex flex-col justify-between">
                <div class="font-bold">
                  <Pill small type="hl">
                    {template.sessions.length}
                  </Pill>{' '}
                  {template.name}
                </div>
                <Sessions sessions={template.sessions} />
                {/* <div>
                    <sub>{sess ? `${toDuration(new Date(sess.updated))} ago` : 'no sessions'}</sub>
                  </div> */}
              </SolidCard>
            )
          }}
        </For>

        <Divider />
      </div>
    </>
  )
}

const Sessions: Component<{ sessions: SagaSession[] }> = (props) => {
  const nav = useNavigate()

  return (
    <div class="flex flex-wrap gap-1">
      <For each={props.sessions}>
        {(session) => (
          <a
            class="cursor-pointer"
            onClick={() => {
              sagaStore.loadSession(session._id)
              nav(toSessionUrl(session._id))
            }}
          >
            <Pill type="hl">
              <Pill small type="bg">
                {session.responses.length}
              </Pill>
              &nbsp;
              {toDuration(new Date(session.updated))} ago
            </Pill>
          </a>
        )}
      </For>
    </div>
  )
}
