import { Component, createMemo, createSignal } from 'solid-js'
import PageHeader from '../../shared/PageHeader'
import { setComponentPageTitle } from '../../shared/util'
import Tabs from '../../shared/Tabs'
import FilterSettings from './FilterSettings'
import CharList from './CharList'
import BookList from './BookList'

const chubTabs = {
  characters: 'Characters',
  lorebooks: 'Lorebooks',
  filter: 'Filter Settings',
}

type Tab = keyof typeof chubTabs

const Chub: Component = () => {
  const [tab, setTab] = createSignal(0)
  const tabs: Tab[] = ['characters', 'lorebooks', 'filter']

  const currentTab = createMemo(() => tabs[tab()])
  setComponentPageTitle('CHUB')

  const tabClass = `flex flex-col gap-4`

  return (
    <>
      <PageHeader title="Character Hub" />
      Download Characters and Lorebooks from{' '}
      <a href="https://characterhub.org" class="text-[var(--hl-500)]">
        CHUB
      </a>
      <div class="my-2">
        <Tabs tabs={tabs.map((t) => chubTabs[t])} selected={tab} select={setTab} />
      </div>
      <div class="flex flex-col gap-4">
        <div class={currentTab() === 'characters' ? tabClass : 'hidden'}>
          <CharList />
        </div>

        <div class={currentTab() === 'lorebooks' ? tabClass : 'hidden'}>
          <BookList />
        </div>

        <div class={currentTab() === 'filter' ? tabClass : 'hidden'}>
          <FilterSettings />
        </div>
      </div>
    </>
  )
}

export default Chub
