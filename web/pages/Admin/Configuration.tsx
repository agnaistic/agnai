import { Component, Match, Switch, createEffect, createSignal, on, onMount } from 'solid-js'
import { adminStore, userStore } from '/web/store'
import { useNavigate, useSearchParams } from '@solidjs/router'
import PageHeader from '/web/shared/PageHeader'
import { SaveIcon } from 'lucide-solid'
import Button from '/web/shared/Button'
import { Page } from '/web/Layout'
import Loading from '/web/shared/Loading'
import Tabs, { useTabs } from '/web/shared/Tabs'
import { General } from './Config/General'
import { Voice } from './Config/Voice'
import { Images } from './Config/Images'
import { v4 } from 'uuid'
import { ImageModel } from '/common/types/admin'
import { createStore } from 'solid-js/store'
import { ConfigState } from './types'
import { EmbeddingConfig } from './Config/Embeddings'

export { ServerConfiguration as default }

const ServerConfiguration: Component = () => {
  let form: HTMLFormElement
  const user = userStore((s) => ({ user: s.user }))
  const state = adminStore((s) => ({ config: s.config }))
  const [store, setStore] = createStore<ConfigState & { _id?: string }>(state.config! || {})

  const nav = useNavigate()
  const [search, setSearch] = useSearchParams()

  const tab = useTabs(['General', 'Images', 'Voice', 'Embeddings'], +(search.cfg_tab || '0'))

  createEffect(() => {
    setSearch({ cfg_tab: tab.selected().toString() })
  })

  if (!user.user?.admin) {
    nav('/')
    return null
  }

  const models = createSignal(
    Array.isArray(state.config?.imagesModels)
      ? state.config.imagesModels.map(toIdentifiedModel)
      : []
  )

  createEffect(
    on(
      () => state.config,
      () => {
        if (!state.config?.imagesModels) return
        models[1](state.config?.imagesModels.map(toIdentifiedModel))
      }
    )
  )

  onMount(async () => {
    await adminStore.getConfiguration((config) => setStore({ ...config }))
  })

  const submit = () => {
    const { _id, tosUpdated, privacyUpdated, kind, ...body } = store

    adminStore.updateServerConfig(body)
  }

  return (
    <Page>
      <PageHeader title="Server Configuration" />

      <Switch>
        <Match when={!state.config}>
          <div class="mt-24 flex justify-center">
            <Loading />
          </div>
        </Match>

        <Match when>
          <Tabs tabs={tab.tabs()} select={tab.select} selected={tab.selected} />

          <form ref={form!} class="flex flex-col gap-2" onSubmit={(ev) => ev.preventDefault()}>
            <div class="flex flex-col gap-2" classList={{ hidden: tab.current() !== 'General' }}>
              <General state={store} setters={setStore} />
            </div>
            <div class="flex flex-col gap-2" classList={{ hidden: tab.current() !== 'Voice' }}>
              <Voice state={store} setters={setStore} />
            </div>
            <div class="flex flex-col gap-2" classList={{ hidden: tab.current() !== 'Images' }}>
              <Images state={store} setters={setStore} />
            </div>

            <div class="flex flex-col gap-2" classList={{ hidden: tab.current() !== 'Embeddings' }}>
              <EmbeddingConfig />
            </div>

            <div class="flex justify-end" classList={{ hidden: tab.current() === 'Embeddings' }}>
              <Button onClick={submit} class="w-fit">
                <SaveIcon /> Save
              </Button>
            </div>
          </form>
        </Match>
      </Switch>
    </Page>
  )
}

function toIdentifiedModel(item: ImageModel) {
  if (item.id) return item
  return { ...item, level: item.level ?? 0, id: v4().slice(0, 4) }
}
