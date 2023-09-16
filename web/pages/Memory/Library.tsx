import { Component, Match, Switch, createEffect, createMemo } from 'solid-js'
import { settingStore } from '/web/store/settings'
import Tabs, { useTabs } from '/web/shared/Tabs'
import { setComponentPageTitle } from '/web/shared/util'
import ScenarioList from '../Scenario/ScenarioList'
import PromptTemplates from '../PromptTemplates'
import { BooksTab, EmbedsTab } from './Memory'
import { useSearchParams } from '@solidjs/router'

export { Library as default }

const Library: Component = () => {
  const [params, setParams] = useSearchParams()
  setComponentPageTitle('Library')
  const cfg = settingStore()

  const allowed = createMemo(() => {
    const base = ['Memories', 'Scenarios', 'Prompt Templates']
    if (cfg.pipelineOnline) {
      base.push('Embeddings')
    }
    return base
  })

  const tabs = useTabs(allowed(), +(params.tab || '0'))

  createEffect(() => {
    const index = tabs.selected()
    setParams({ tab: index })
  })

  return (
    <>
      <Tabs tabs={tabs.tabs} select={tabs.select} selected={tabs.selected} />

      <Switch>
        <Match when={tabs.current() === 'Memories'}>
          <BooksTab />
        </Match>

        <Match when={tabs.current() === 'Scenarios'}>
          <ScenarioList />
        </Match>

        <Match when={tabs.current() === 'Prompt Templates'}>
          <PromptTemplates />
        </Match>

        <Match when={tabs.current() === 'Embeddings'}>
          <EmbedsTab />
        </Match>
      </Switch>
    </>
  )
}
