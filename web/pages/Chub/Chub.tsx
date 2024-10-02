import { Component, Show, createEffect, createMemo, createSignal, onMount } from 'solid-js'
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
import { Page } from '/web/Layout'
import { ListFilter } from 'lucide-solid'
import Button from '/web/shared/Button'
import Modal from '/web/shared/Modal'

const chubTabs = {
  characters: 'Characters',
  lorebooks: 'Lorebooks',
}

type Tab = keyof typeof chubTabs

const Chub: Component = () => {
  const params = useParams()
  const nav = useNavigate()
  const tabs: Tab[] = ['characters', 'lorebooks']

  const [tab, setTab] = createSignal(0)
  const [charModal, setCharModal] = createSignal<{ char: NewCharacter; fullPath: string }>()
  const [bookModal, setBookModal] = createSignal<{ book: AppSchema.MemoryBook; fullPath: string }>()
  const [loading, setLoading] = createSignal(false)
  const [filter, setFilter] = createSignal(false)

  createEffect(() => {
    const index = tabs.indexOf(params.tab || ('characters' as any))
    setTab(index)
  })

  onMount(() => {
    window.flag('chub', true)
  })

  const currentTab = createMemo(() => tabs[tab()])
  setComponentPageTitle('CHUB')

  const tabClass = `flex flex-col gap-4`

  return (
    <Page>
      <PageHeader title="Character Hub" />

      <div class="my-2 flex gap-2">
        <Button schema="clear" onClick={() => setFilter(true)}>
          <ListFilter />
        </Button>

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
      <Modal
        show={filter()}
        close={() => setFilter(false)}
        footer={<Button onClick={() => setFilter(false)}>Close</Button>}
      >
        <FilterSettings />
      </Modal>
    </Page>
  )
}

export default Chub
