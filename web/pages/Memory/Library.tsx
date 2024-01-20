import { Component, Match, Switch, createEffect, createMemo } from 'solid-js'
import Tabs, { useTabs } from '/web/shared/Tabs'
import { setComponentPageTitle } from '/web/shared/util'
import ScenarioList from '../Scenario/ScenarioList'
import PromptTemplates from '../PromptTemplates'
import { BooksTab, EmbedsTab } from './Memory'
import { useSearchParams } from '@solidjs/router'
import { useTransContext } from '@mbarzda/solid-i18next'

export { Library as default }

const Library: Component = () => {
  const [t] = useTransContext()

  const [params, setParams] = useSearchParams()
  setComponentPageTitle(t('library'))

  const allowed = createMemo(() => {
    const base = [t('memories'), t('scenarios'), t('prompt_templates'), t('embeddings')]

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
        <Match when={tabs.current() === t('memories')}>
          <BooksTab />
        </Match>

        <Match when={tabs.current() === t('scenarios')}>
          <ScenarioList />
        </Match>

        <Match when={tabs.current() === t('prompt_templates')}>
          <PromptTemplates />
        </Match>

        <Match when={tabs.current() === t('embeddings')}>
          <EmbedsTab />
        </Match>
      </Switch>
    </>
  )
}
