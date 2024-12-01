import { Component, Match, Switch, createEffect, createSignal, on, onMount } from 'solid-js'
import { adminStore, userStore } from '/web/store'
import { useNavigate, useSearchParams } from '@solidjs/router'
import PageHeader from '/web/shared/PageHeader'
import { getStrictForm } from '/web/shared/util'
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

export { ServerConfiguration as default }

const ServerConfiguration: Component = () => {
  let form: HTMLFormElement
  const user = userStore()
  const nav = useNavigate()
  const [search, setSearch] = useSearchParams()

  const state = adminStore()
  const tab = useTabs(['General', 'Images', 'Voice'], +(search.cfg_tab || '0'))

  createEffect(() => {
    setSearch({ cfg_tab: tab.selected().toString() })
  })

  const [slots, setSlots] = createSignal(state.config?.slots || '{}')

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
    await adminStore.getConfiguration()
  })

  const submit = () => {
    const body = getStrictForm(form, {
      apiAccess: ['off', 'users', 'subscribers', 'admins'],
      ttsAccess: ['off', 'users', 'subscribers', 'admins'],
      slots: 'string',
      maintenance: 'boolean',
      maintenanceMessage: 'string',
      termsOfService: 'string',
      privacyStatement: 'string',
      policiesEnabled: 'boolean',
      imagesHost: 'string',
      imagesEnabled: 'boolean',
      supportEmail: 'string',
      ttsEnabled: 'boolean',
      ttsApiKey: 'string',
      ttsHost: 'string',
      maxGuidanceTokens: 'number',
      maxGuidanceVariables: 'number',
      googleClientId: 'string',
      googleEnabled: 'boolean',
      lockSeconds: 'number',
      stripeCustomerPortal: 'string',
    })

    adminStore.updateServerConfig({
      ...body,
      actionCalls: [],
      slots: slots(),
      imagesModels: models[0](),
      enabledAdapters: [],
    })
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
          <Tabs tabs={tab.tabs} select={tab.select} selected={tab.selected} />

          <form ref={form!} class="flex flex-col gap-2" onSubmit={(ev) => ev.preventDefault()}>
            <div class="flex flex-col gap-2" classList={{ hidden: tab.current() !== 'General' }}>
              <General slots={slots} setSlots={setSlots} />
            </div>
            <div class="flex flex-col gap-2" classList={{ hidden: tab.current() !== 'Voice' }}>
              <Voice />
            </div>
            <div class="flex flex-col gap-2" classList={{ hidden: tab.current() !== 'Images' }}>
              <Images models={models} />
            </div>

            <div class="flex justify-end">
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
