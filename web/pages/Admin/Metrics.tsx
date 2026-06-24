import { Component, createMemo, createSignal, For, onMount } from 'solid-js'
import Button from '../../shared/Button'
import { FormLabel } from '../../shared/FormLabel'
import PageHeader from '../../shared/PageHeader'
import { setComponentPageTitle } from '../../shared/util'
import { adminStore } from '../../store'
import { Card } from '/web/shared/Card'
import TextInput from '/web/shared/TextInput'
import { ConfirmModal } from '/web/shared/Modal'
import { Page } from '/web/Layout'
import { createStore } from 'solid-js/store'

const MetricsPage: Component = () => {
  let refForm: any

  setComponentPageTitle('指标')
  const admin = adminStore((s) => ({ metrics: s.metrics }))
  const [refMsg, setRefMsg] = createSignal<any>()
  const [confirm, setConfirm] = createSignal(false)

  const [store, setStore] = createStore({ message: '', userLevel: -1 })

  onMount(() => adminStore.getMetrics())

  const sendAll = () => {
    const { message, userLevel } = store
    adminStore.sendAll(message, userLevel, () => {
      refMsg().value = ''
    })
  }

  const shas = createMemo(() => {
    return Object.entries(admin.metrics?.shas || {})
      .map(([sha, count]) => ({ sha, count }))
      .sort((l, r) => r.count - l.count)
  })

  return (
    <Page>
      <PageHeader title="指标" />
      <div class="mb-4 flex gap-4">
        <Button onClick={adminStore.getMetrics}>刷新</Button>
      </div>

      <div class="flex flex-col gap-2 text-xl">
        <FormLabel
          fieldName="active"
          label="在线用户"
          helperText={admin.metrics?.connected || '...'}
        />

        <div class="flex flex-col gap-1">
          <div class="font-bold">版本</div>

          <For each={shas()}>
            {(each) => (
              <div class="flex gap-1 text-sm">
                {each.sha}: {each.count}
              </div>
            )}
          </For>
        </div>

        <FormLabel
          fieldName="active"
          label="最高在线用户"
          helperText={admin.metrics?.maxLiveCount || '...'}
        />

        <FormLabel
          fieldName="totalUsers"
          label="注册用户"
          helperText={admin.metrics?.totalUsers || '...'}
        />

        <FormLabel fieldName="services" label="服务" helperText={admin.metrics?.each.length} />

        <Card>
          <form ref={refForm} class="flex flex-col gap-1">
            <FormLabel label="向所有用户发送消息" />
            <TextInput
              ref={setRefMsg}
              isMultiline
              value={store.message}
              onChange={(ev) => setStore('message', ev.currentTarget.value)}
            />
            <TextInput
              type="number"
              value={store.userLevel}
              onChange={(ev) => setStore('userLevel', +ev.currentTarget.value)}
            />
            <Button onClick={() => setConfirm(true)}>发送</Button>
          </form>
        </Card>
      </div>

      <ConfirmModal
        show={confirm()}
        close={() => setConfirm(false)}
        confirm={sendAll}
        message="确定要向所有用户发送消息吗？"
      />
    </Page>
  )
}

export default MetricsPage
