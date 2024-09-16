import { Component, For, Match, Switch, createEffect, createMemo } from 'solid-js'
import { useTabs } from '/web/shared/Tabs'
import { setComponentPageTitle } from '/web/shared/util'
import ScenarioList from '../Scenario/ScenarioList'
import PromptTemplates from '../PromptTemplates'
import { BooksTab, EmbedsTab } from './Memory'
import { useSearchParams } from '@solidjs/router'
import Button from '/web/shared/Button'

export { Library as default }

const Library: Component = () => {
  const [params, setParams] = useSearchParams()
  setComponentPageTitle('Library')

  const allowed = createMemo(() => {
    const base = ['Memories', 'Scenarios', 'Templates', 'Embeddings']

    return base
  })

  const tabs = useTabs(allowed(), +(params.tab || '0'))

  createEffect(() => {
    const index = tabs.selected()
    setParams({ tab: index })
  })

  return (
    <>
      <div class="flex flex-wrap justify-center gap-2 py-2">
        <For each={allowed()}>
          {(name, i) => (
            <Button
              schema={tabs.selected() === i() ? 'primary' : 'secondary'}
              onClick={() => tabs.select(i())}
            >
              {name}
            </Button>
          )}
        </For>
      </div>

      <Switch>
        <Match when={tabs.current() === 'Memories'}>
          <BooksTab />
        </Match>

        <Match when={tabs.current() === 'Scenarios'}>
          <ScenarioList />
        </Match>

        <Match when={tabs.current() === 'Templates'}>
          <PromptTemplates />
        </Match>

        <Match when={tabs.current() === 'Embeddings'}>
          <EmbedsTab />
        </Match>
      </Switch>
    </>
  )
}
