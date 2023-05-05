import { Component, createMemo, createSignal } from 'solid-js'
import PageHeader from '../../shared/PageHeader'
import { setComponentPageTitle } from '../../shared/util'
import Tabs from '../../shared/Tabs'
import FilterSettings from './FilterSettings'
import CharList from './CharList'
import { ChubOptions } from '../../store/chub'
import BookList from './BookList'

export const chubOptions: ChubOptions = {
  nsfw: false,
  tags: '',
  excludeTags: '',
  sort: 'Download Count',
  search: '',
}

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
  setComponentPageTitle('Character Hub')

  const tabClass = `flex flex-col gap-4`

  return (
    <>
      <PageHeader title="Character Hub" />
      Download Characters and Lorebooks from{' '}
      <a href="https://characterhub.org" class="text-[var(--hl-500)]">
        Character Hub
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
