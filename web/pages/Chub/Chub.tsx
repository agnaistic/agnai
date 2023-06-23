import { Component, Show, createEffect, createMemo, createSignal } from 'solid-js'
import PageHeader from '../../shared/PageHeader'
import { setComponentPageTitle } from '../../shared/util'
import Tabs from '../../shared/Tabs'
import FilterSettings from './FilterSettings'
import CharList from './CharList'
import BookList from './BookList'
import { NewCharacter } from '/web/store'
import { AppSchema } from '/common/types'
import ChubImportCharModal from './ChubImportChar'
import ChubImportBookModal from './ChubImportBook'
import { useNavigate, useParams } from '@solidjs/router'

const chubTabs = {
  characters: 'Characters',
  lorebooks: 'Lorebooks',
  filter: 'Filter Settings',
}

type Tab = keyof typeof chubTabs

const Chub: Component = () => {
  const params = useParams()
  const nav = useNavigate()
  const tabs: Tab[] = ['characters', 'lorebooks', 'filter']

  const [tab, setTab] = createSignal(0)
  const [charModal, setCharModal] = createSignal<{ char: NewCharacter; fullPath: string }>()
  const [bookModal, setBookModal] = createSignal<{ book: AppSchema.MemoryBook; fullPath: string }>()
  const [loading, setLoading] = createSignal(false)

  createEffect(() => {
    const index = tabs.indexOf(params.tab || ('characters' as any))
    setTab(index)
  })

  const currentTab = createMemo(() => tabs[tab()])
  setComponentPageTitle('CHUB')

  const tabClass = `flex flex-col gap-4`

  return (
    <>
      <PageHeader title="Character Hub" />

      <div class="my-2">
        <Tabs
          tabs={tabs.map((t) => chubTabs[t])}
          selected={tab}
          select={(tab) => {
            nav(`/chub/${tabs[tab]}`)
          }}
        />
      </div>
      <div class="flex flex-col gap-4">
        <div class={currentTab() === 'characters' ? tabClass : 'hidden'}>
          <CharList
            loading={() => setLoading(true)}
            setChar={(char, fullPath) => {
              setCharModal({ char, fullPath })
              setLoading(false)
            }}
          />
        </div>

        <div class={currentTab() === 'lorebooks' ? tabClass : 'hidden'}>
          <BookList setBook={(book, fullPath) => setBookModal({ book, fullPath })} />
        </div>

        <div class={currentTab() === 'filter' ? tabClass : 'hidden'}>
          <FilterSettings />
        </div>
      </div>
      <div>
        <sub>
          <em>
            Disclaimer: Characters are owned and managed by{' '}
            <a class="link" href="https://chub.ai" target="_blank">
              CHUB.ai
            </a>
            .
          </em>
        </sub>
      </div>
      <Show when={loading() || !!charModal()}>
        <ChubImportCharModal show={true} close={() => setCharModal()} char={charModal()?.char} />
      </Show>
      <Show when={bookModal()}>
        <ChubImportBookModal
          show={true}
          close={() => setBookModal()}
          fullPath={bookModal()!.fullPath}
          book={bookModal()!.book}
        />
      </Show>
    </>
  )
}

export default Chub
