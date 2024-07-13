import { Component, For, createEffect, createMemo, onMount } from 'solid-js'
import { sagaStore } from './state'
import { Pill, SolidCard } from '/web/shared/Card'
import { toDuration, toEntityMap } from '/web/shared/util'
import PageHeader from '/web/shared/PageHeader'
import { useNavigate } from '@solidjs/router'
import Divider from '/web/shared/Divider'
import { markdown } from '/web/shared/markdown'
import { neat } from '/common/util'
import Button from '/web/shared/Button'
import { PlusIcon, TrashIcon } from 'lucide-solid'
import { GuidanceHelp } from './Help'
import { toSessionUrl } from './util'
import { Saga } from '/common/types'
import { Page } from '/web/Layout'

export const SagaList: Component = (props) => {
  const nav = useNavigate()
  const state = sagaStore()

  onMount(() => sagaStore.init())

  const sessions = createMemo(() => {
    const temps = toEntityMap(state.templates)
    const list = state.sessions
      .filter((s) => {
        if (!s.updated) return false
        if (s.templateId in temps === false) return false
        return true
      })
      .map((s) => {
        return {
          session: s,
          template: temps[s.templateId],
          url: toSessionUrl(s._id),
          updated: new Date(s.updated),
        }
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

  const Subtitle = (
    <a class="link" onClick={() => sagaStore.setState({ showModal: 'help' })}>
      Saga Template Help
    </a>
  )

  return (
    <Page>
      <PageHeader title="Preview: Sagas" subtitle={Subtitle} />
      <div class="flex w-full flex-col gap-1">
        <SolidCard class="rendered-markdown">
          <div
            innerHTML={markdown.makeHtml(
              neat`This is a preview of "Sagas". These are open ended text-based adventures made by users.`
            )}
          ></div>
        </SolidCard>
        <div>
          <Button
            onClick={() => {
              sagaStore.createTemplate('open_world')
              nav(toSessionUrl('new'))
            }}
          >
            <PlusIcon /> New Template
          </Button>
        </div>

        <SessionList />

        <GuidanceHelp />
        <Divider />
      </div>
    </Page>
  )
}

export const SessionList: Component<{
  onSession?: () => void
}> = (props) => {
  const state = sagaStore()

  const templates = createMemo(() => {
    const list = state.templates
      .map((template) => {
        const sessions = state.sessions
          .filter((s) => s.templateId === template._id && !!s.updated)
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

  return (
    <For each={templates()}>
      {(template) => {
        if (!template.sessions.length) return null

        return (
          <SolidCard bg="bg-700" class="flex flex-col justify-between">
            <div class="flex justify-between">
              <div class="font-bold">
                <Pill small type="hl">
                  {template.sessions.length}
                </Pill>{' '}
                {template.name}
              </div>
              <div>
                <Button
                  schema="red"
                  size="sm"
                  onClick={() => sagaStore.deleteTemplate(template._id)}
                >
                  <TrashIcon size={12} />
                </Button>
              </div>
            </div>
            <Sessions
              sessions={template.sessions}
              current={state.state}
              onSession={props.onSession}
            />
          </SolidCard>
        )
      }}
    </For>
  )
}

const Sessions: Component<{
  sessions: Saga.Session[]
  current: Saga.Session
  onSession?: () => void
}> = (props) => {
  const nav = useNavigate()

  return (
    <div class="flex flex-wrap gap-1">
      <For each={props.sessions}>
        {(session) => (
          <a class="cursor-pointer">
            <Pill
              type="bg"
              onClick={() => {
                props.onSession?.()
                sagaStore.loadSession(session._id)
                nav(toSessionUrl(session._id))
              }}
            >
              <Pill small type="bg" inverse>
                {session.responses.length}
              </Pill>
              &nbsp;
              {toDuration(new Date(session.updated))} ago
              <Button
                class="ml-1 inline-block"
                size="sm"
                schema="red"
                onClick={() => {
                  sagaStore.deleteSession(session._id)

                  if (props.onSession && props.current._id === session._id) {
                    nav(toSessionUrl('new'))
                  }
                }}
              >
                <TrashIcon size={12} />
              </Button>
            </Pill>
          </a>
        )}
      </For>
    </div>
  )
}
